#!/usr/bin/env node
/**
 * RAG Ingestion Script v2
 * 
 * Improvements over v1:
 * - PDF support (via pdf-parse) for clinical guidelines
 * - Sub-chunking by ### in addition to ## for finer granularity
 * - Strips markdown syntax from chunk content before embedding
 * 
 * Usage:
 *   node --env-file=.env scripts/ingest-rag.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, extname } from 'path';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!OPENAI_API_KEY) { console.error('❌ OPENAI_API_KEY is required'); process.exit(1); }
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) { console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const RAG_DIR = join(import.meta.dirname, '..', 'rag');

// ========================
// Markdown Stripping
// ========================

/** Remove markdown syntax so embeddings and context are clean plain text */
function stripMarkdown(text) {
  return text
    .replace(/^#{1,6}\s+/gm, '')           // # headings
    .replace(/\*\*(.+?)\*\*/g, '$1')       // **bold**
    .replace(/\*(.+?)\*/g, '$1')           // *italic*
    .replace(/`(.+?)`/g, '$1')             // `code`
    .replace(/^\s*[-*+]\s+/gm, '・')       // - list items → ・
    .replace(/^\s*>\s+/gm, '')             // > blockquotes
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')    // [links](url)
    .replace(/\|/g, ' ')                   // table pipes
    .replace(/^-{3,}$/gm, '')              // horizontal rules
    .replace(/\n{3,}/g, '\n\n')            // collapse excess newlines
    .trim();
}

// ========================
// Chunking
// ========================

/**
 * Split markdown by ## and ### headings into fine-grained chunks.
 * Each chunk = one ### section (or ## section if no ### children).
 */
function chunkMarkdown(content, filename) {
  const lines = content.split('\n');
  const chunks = [];
  let fileTitle = filename;
  let h2Title = null;
  let h3Title = null;
  let currentLines = [];

  function flush() {
    const text = stripMarkdown(currentLines.join('\n')).trim();
    if (text.length > 30) {
      const titleParts = [fileTitle];
      if (h2Title) titleParts.push(h2Title);
      if (h3Title) titleParts.push(h3Title);
      chunks.push({
        title: titleParts.join(' — '),
        content: text,
      });
    }
    currentLines = [];
  }

  for (const line of lines) {
    // File-level title
    if (/^# [^#]/.test(line)) {
      fileTitle = line.replace(/^#\s+/, '').trim();
      continue;
    }

    // ## section boundary
    if (/^## [^#]/.test(line)) {
      flush();
      h2Title = line.replace(/^##\s+/, '').trim();
      h3Title = null;
      continue;
    }

    // ### sub-section boundary
    if (/^### [^#]/.test(line)) {
      flush();
      h3Title = line.replace(/^###\s+/, '').trim();
      continue;
    }

    currentLines.push(line);
  }

  flush(); // last chunk

  // If no sections found, treat entire file as one chunk
  if (chunks.length === 0 && content.trim().length > 30) {
    chunks.push({
      title: fileTitle,
      content: stripMarkdown(content.trim()),
    });
  }

  return chunks;
}

/**
 * Chunk PDF text by paragraphs (~500 char target).
 */
function chunkPdfText(text, filename) {
  const chunks = [];
  // Split by double newlines (paragraphs)
  const paragraphs = text.split(/\n{2,}/);
  let currentChunk = [];
  let currentLen = 0;
  const TARGET_SIZE = 500;

  for (const para of paragraphs) {
    const cleaned = para.replace(/\s+/g, ' ').trim();
    if (cleaned.length < 20) continue; // skip tiny fragments

    if (currentLen + cleaned.length > TARGET_SIZE && currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n\n'));
      currentChunk = [];
      currentLen = 0;
    }
    currentChunk.push(cleaned);
    currentLen += cleaned.length;
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n\n'));
  }

  return chunks.map((content, i) => ({
    title: `${filename} — Section ${i + 1}`,
    content,
  }));
}

// ========================
// PDF Parsing
// ========================

async function parsePdf(filepath) {
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const buffer = readFileSync(filepath);
    const uint8 = new Uint8Array(buffer);
    const doc = await pdfjsLib.getDocument({ data: uint8 }).promise;
    let fullText = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map(item => item.str);
      fullText += strings.join(' ') + '\n\n';
    }
    return fullText;
  } catch (err) {
    console.warn(`  ⚠️ Failed to parse PDF: ${err.message}`);
    return null;
  }
}

// ========================
// Embedding
// ========================

async function getEmbedding(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

async function getEmbeddings(texts) {
  const embeddings = [];
  for (let i = 0; i < texts.length; i++) {
    process.stdout.write(`  Embedding ${i + 1}/${texts.length}...\r`);
    embeddings.push(await getEmbedding(texts[i]));
    if (i < texts.length - 1) await new Promise(r => setTimeout(r, 200));
  }
  console.log();
  return embeddings;
}

// ========================
// Main
// ========================

async function main() {
  console.log('🔍 Reading files from', RAG_DIR);

  const allFiles = readdirSync(RAG_DIR).filter(f => !f.startsWith('.'));
  const mdFiles = allFiles.filter(f => f.endsWith('.md'));
  const pdfFiles = allFiles.filter(f => f.endsWith('.pdf'));

  console.log(`📄 Found ${mdFiles.length} markdown files, ${pdfFiles.length} PDF files`);

  // Chunk all files
  const allChunks = [];

  // Markdown files
  for (const file of mdFiles) {
    const content = readFileSync(join(RAG_DIR, file), 'utf-8');
    const chunks = chunkMarkdown(content, file);
    console.log(`  📝 ${file}: ${chunks.length} chunks`);
    for (let i = 0; i < chunks.length; i++) {
      allChunks.push({
        source_file: file,
        chunk_index: i,
        title: chunks[i].title,
        content: chunks[i].content,
      });
    }
  }

  // PDF files
  for (const file of pdfFiles) {
    console.log(`  📕 ${file}: parsing PDF...`);
    const text = await parsePdf(join(RAG_DIR, file));
    if (!text) continue;
    const chunks = chunkPdfText(text, file);
    console.log(`     → ${chunks.length} chunks`);
    for (let i = 0; i < chunks.length; i++) {
      allChunks.push({
        source_file: file,
        chunk_index: i,
        title: chunks[i].title,
        content: chunks[i].content,
      });
    }
  }

  console.log(`\n📦 Total chunks: ${allChunks.length}`);

  // Generate embeddings
  console.log('\n🧠 Generating embeddings...');
  const texts = allChunks.map(c => `${c.title}\n\n${c.content}`);
  const embeddings = await getEmbeddings(texts);

  // Clear existing data
  console.log('\n🗑️  Clearing existing rag_documents...');
  const { error: deleteError } = await supabase
    .from('rag_documents')
    .delete()
    .gte('id', 0);
  if (deleteError) {
    console.error('❌ Delete error:', deleteError.message);
    process.exit(1);
  }

  // Insert chunks with embeddings
  console.log('💾 Inserting chunks...');
  const rows = allChunks.map((chunk, i) => ({
    source_file: chunk.source_file,
    chunk_index: chunk.chunk_index,
    title: chunk.title,
    content: chunk.content,
    embedding: JSON.stringify(embeddings[i]),
    metadata: { char_count: chunk.content.length },
  }));

  for (let i = 0; i < rows.length; i += 10) {
    const batch = rows.slice(i, i + 10);
    const { error } = await supabase.from('rag_documents').insert(batch);
    if (error) {
      console.error(`❌ Insert error (batch ${i}):`, error.message);
      process.exit(1);
    }
  }

  console.log(`\n✅ Done! Inserted ${rows.length} chunks into rag_documents`);

  // Summary
  console.log('\n📊 Summary:');
  const sources = [...new Set(allChunks.map(c => c.source_file))];
  for (const src of sources) {
    const count = allChunks.filter(c => c.source_file === src).length;
    console.log(`  ${src}: ${count} chunks`);
  }
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
