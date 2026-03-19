#!/usr/bin/env node
/**
 * RAG Ingestion Script
 * 
 * Reads markdown files from rag/ directory, chunks by ## sections,
 * generates OpenAI embeddings, and stores in Supabase rag_documents table.
 * 
 * Usage:
 *   export OPENAI_API_KEY=sk-...
 *   export SUPABASE_URL=https://xxx.supabase.co
 *   export SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *   node scripts/ingest-rag.mjs
 * 
 * Or with .env file:
 *   node --env-file=.env scripts/ingest-rag.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is required');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const RAG_DIR = join(import.meta.dirname, '..', 'rag');

// ========================
// Chunking
// ========================

/**
 * Split markdown by ## headings into chunks.
 * Each chunk includes the file title (# heading) + section (## heading + content).
 */
function chunkMarkdown(content, filename) {
  const lines = content.split('\n');
  const chunks = [];
  let fileTitle = filename; // fallback
  let currentTitle = null;
  let currentLines = [];

  for (const line of lines) {
    // File-level title
    if (line.startsWith('# ') && !line.startsWith('## ')) {
      fileTitle = line.replace(/^#\s+/, '').trim();
      continue;
    }

    // Section boundary
    if (line.startsWith('## ')) {
      // Save previous chunk
      if (currentTitle && currentLines.length > 0) {
        const text = currentLines.join('\n').trim();
        if (text.length > 30) { // skip tiny chunks
          chunks.push({
            title: `${fileTitle} — ${currentTitle}`,
            content: text,
          });
        }
      }
      currentTitle = line.replace(/^##\s+/, '').trim();
      currentLines = [];
      continue;
    }

    currentLines.push(line);
  }

  // Last chunk
  if (currentTitle && currentLines.length > 0) {
    const text = currentLines.join('\n').trim();
    if (text.length > 30) {
      chunks.push({
        title: `${fileTitle} — ${currentTitle}`,
        content: text,
      });
    }
  }

  // If no ## sections found, treat entire file as one chunk
  if (chunks.length === 0 && content.trim().length > 30) {
    chunks.push({
      title: fileTitle,
      content: content.trim(),
    });
  }

  return chunks;
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
      input: text.slice(0, 8000), // limit to ~8k chars
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

// Batch with delay to respect rate limits
async function getEmbeddings(texts) {
  const embeddings = [];
  for (let i = 0; i < texts.length; i++) {
    process.stdout.write(`  Embedding ${i + 1}/${texts.length}...\r`);
    embeddings.push(await getEmbedding(texts[i]));
    // Small delay to be nice to API
    if (i < texts.length - 1) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  console.log();
  return embeddings;
}

// ========================
// Main
// ========================

async function main() {
  console.log('🔍 Reading markdown files from', RAG_DIR);

  const files = readdirSync(RAG_DIR).filter(f => f.endsWith('.md'));
  if (files.length === 0) {
    console.error('❌ No .md files found in', RAG_DIR);
    process.exit(1);
  }

  console.log(`📄 Found ${files.length} files:`, files.join(', '));

  // Chunk all files
  const allChunks = [];
  for (const file of files) {
    const content = readFileSync(join(RAG_DIR, file), 'utf-8');
    const chunks = chunkMarkdown(content, file);
    console.log(`  ${file}: ${chunks.length} chunks`);
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
    .gte('id', 0); // delete all
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

  // Insert in batches of 10
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
  for (const file of files) {
    const fileChunks = allChunks.filter(c => c.source_file === file);
    console.log(`  ${file}: ${fileChunks.length} chunks`);
  }
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
