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
 * Split a chunk containing multiple Q&A pairs into individual pairs.
 * Detects patterns like: **Q: ...** / A: ...
 */
function splitQAPairs(text, parentTitle) {
  // Match Q&A pattern: line starting with Q: (with or without bold markers)
  const qaParts = text.split(/(?=(?:\*\*)?Q[:：]\s)/);
  
  if (qaParts.length <= 1) return null; // No Q&A pairs found

  const pairs = [];
  for (const part of qaParts) {
    const cleaned = stripMarkdown(part).trim();
    if (cleaned.length < 20) continue;

    // Extract question text for title
    const qMatch = cleaned.match(/^Q[:：]\s*(.+?)(?:\n|$)/);
    const question = qMatch ? qMatch[1].trim() : '';
    
    pairs.push({
      title: question ? `${parentTitle} — ${question}` : parentTitle,
      content: cleaned,
    });
  }

  return pairs.length > 0 ? pairs : null;
}

/**
 * Split markdown by ## and ### headings into fine-grained chunks.
 * Additionally splits FAQ-style Q&A pairs into individual chunks.
 */
function chunkMarkdown(content, filename) {
  const lines = content.split('\n');
  const rawChunks = [];
  let fileTitle = filename;
  let h2Title = null;
  let h3Title = null;
  let currentLines = [];

  function flush() {
    const rawText = currentLines.join('\n').trim();
    if (rawText.length > 30) {
      const titleParts = [fileTitle];
      if (h2Title) titleParts.push(h2Title);
      if (h3Title) titleParts.push(h3Title);
      rawChunks.push({
        title: titleParts.join(' — '),
        rawContent: rawText,
      });
    }
    currentLines = [];
  }

  for (const line of lines) {
    if (/^# [^#]/.test(line)) {
      fileTitle = line.replace(/^#\s+/, '').trim();
      continue;
    }
    if (/^## [^#]/.test(line)) {
      flush();
      h2Title = line.replace(/^##\s+/, '').trim();
      h3Title = null;
      continue;
    }
    if (/^### [^#]/.test(line)) {
      flush();
      h3Title = line.replace(/^###\s+/, '').trim();
      continue;
    }
    currentLines.push(line);
  }
  flush();

  // Post-process: split chunks with Q&A pairs
  const chunks = [];
  for (const raw of rawChunks) {
    const qaPairs = splitQAPairs(raw.rawContent, raw.title);
    if (qaPairs) {
      chunks.push(...qaPairs);
    } else {
      chunks.push({
        title: raw.title,
        content: stripMarkdown(raw.rawContent),
      });
    }
  }

  // Fallback: if no sections found, treat entire file as one chunk
  if (chunks.length === 0 && content.trim().length > 30) {
    chunks.push({
      title: fileTitle,
      content: stripMarkdown(content.trim()),
    });
  }

  return chunks;
}

/**
 * Chunk PDF text by section headers or paragraphs (~500 char target).
 * Tries to detect section headers (numbered like "1." or all-caps lines)
 * for more meaningful splits before falling back to paragraph-based chunking.
 */
function chunkPdfText(text, filename) {
  const chunks = [];
  
  // Try section-based splitting first (common in clinical guidelines)
  // Look for numbered section headers or lines that look like headings
  const sections = text.split(/\n(?=(?:\d+\.\s+[A-Z]|[A-Z]{2,}[A-Z\s]{5,}\n))/);
  
  if (sections.length > 3) {
    // Section-based splitting worked
    for (const section of sections) {
      const cleaned = section.replace(/\s+/g, ' ').trim();
      if (cleaned.length < 50) continue;
      
      // If section is too long, sub-chunk by paragraphs
      if (cleaned.length > 1000) {
        const subChunks = paragraphChunk(cleaned, 500);
        for (let i = 0; i < subChunks.length; i++) {
          const firstLine = subChunks[i].split(/[.!?]\s/)[0] || '';
          chunks.push({
            title: `${filename} — ${firstLine.slice(0, 80)}`,
            content: subChunks[i],
          });
        }
      } else {
        const firstLine = cleaned.split(/[.!?]\s/)[0] || '';
        chunks.push({
          title: `${filename} — ${firstLine.slice(0, 80)}`,
          content: cleaned,
        });
      }
    }
  }
  
  // Fallback: paragraph-based chunking
  if (chunks.length === 0) {
    const subChunks = paragraphChunk(text, 500);
    for (let i = 0; i < subChunks.length; i++) {
      chunks.push({
        title: `${filename} — Section ${i + 1}`,
        content: subChunks[i],
      });
    }
  }

  return chunks;
}

/** Helper: split text into ~targetSize char chunks by paragraph boundaries */
function paragraphChunk(text, targetSize) {
  const paragraphs = text.split(/\n{2,}/);
  const chunks = [];
  let current = [];
  let currentLen = 0;

  for (const para of paragraphs) {
    const cleaned = para.replace(/\s+/g, ' ').trim();
    if (cleaned.length < 20) continue;

    if (currentLen + cleaned.length > targetSize && current.length > 0) {
      chunks.push(current.join('\n\n'));
      current = [];
      currentLen = 0;
    }
    current.push(cleaned);
    currentLen += cleaned.length;
  }
  if (current.length > 0) {
    chunks.push(current.join('\n\n'));
  }

  return chunks;
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
