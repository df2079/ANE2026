#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function parseArgs(argv) {
  const options = {
    voters: 100,
    weighted: false
  };

  for (const arg of argv) {
    if (arg.startsWith("--voters=")) {
      const value = Number(arg.slice("--voters=".length));
      if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`Invalid --voters value: ${arg}`);
      }
      options.voters = value;
      continue;
    }

    if (arg === "--weighted") {
      options.weighted = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`Testing-only utility: generate fake voters and fake votes.

Usage:
  node scripts/generate-test-votes.mjs --voters=300
  node scripts/generate-test-votes.mjs --voters=300 --weighted

Options:
  --voters=<number>   Number of fake voters to create (default: 100)
  --weighted          Bias random vote selection toward earlier nominees
`);
}

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error(".env.local was not found.");
  }

  const contents = fs.readFileSync(envPath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    const rawValue = trimmed.slice(equalsIndex + 1).trim();
    const value = rawValue.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function requireEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

function chunk(array, size) {
  const chunks = [];
  for (let index = 0; index < array.length; index += size) {
    chunks.push(array.slice(index, index + size));
  }
  return chunks;
}

function buildWeightedIndices(length) {
  return Array.from({ length }, (_, index) => length - index);
}

function chooseIndex(length, weighted) {
  if (length <= 1) {
    return 0;
  }

  if (!weighted) {
    return Math.floor(Math.random() * length);
  }

  const weights = buildWeightedIndices(length);
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  let target = Math.random() * totalWeight;

  for (let index = 0; index < weights.length; index += 1) {
    target -= weights[index];
    if (target <= 0) {
      return index;
    }
  }

  return 0;
}

function fakeEmail(index, runSuffix) {
  return `test-voter-${runSuffix}-${String(index + 1).padStart(3, "0")}@example.test`;
}

function createSupabaseAdminClient() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

async function fetchVotingData(supabase) {
  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, name, nominee_type, sort_order")
    .eq("is_active", true)
    .order("sort_order");

  if (categoriesError) {
    throw categoriesError;
  }

  if (!categories?.length) {
    throw new Error("No active categories were found. Sync workbook data first.");
  }

  const { data: nominees, error: nomineesError } = await supabase
    .from("category_nominees")
    .select("category_id, brand_id, perfume_id, sort_label")
    .order("sort_label");

  if (nomineesError) {
    throw nomineesError;
  }

  const nomineesByCategoryId = new Map();
  for (const nominee of nominees ?? []) {
    const group = nomineesByCategoryId.get(nominee.category_id) ?? [];
    group.push(nominee);
    nomineesByCategoryId.set(nominee.category_id, group);
  }

  for (const category of categories) {
    const rows = nomineesByCategoryId.get(category.id) ?? [];
    if (!rows.length) {
      throw new Error(`Category "${category.name}" has no nominees. Sync workbook data first.`);
    }
  }

  return {
    categories,
    nomineesByCategoryId
  };
}

async function insertVoters(supabase, voterCount) {
  const createdVoters = [];
  const runSuffix = Date.now().toString(36);
  const voterRows = Array.from({ length: voterCount }, (_, index) => {
    const email = fakeEmail(index, runSuffix);
    return {
      email,
      normalized_email: email.toLowerCase(),
      newsletter_opt_in: Math.random() < 0.3,
      device_token: crypto.randomUUID()
    };
  });

  for (const batch of chunk(voterRows, 200)) {
    const { data, error } = await supabase
      .from("voters")
      .insert(batch)
      .select("id, email, newsletter_opt_in");

    if (error) {
      throw error;
    }

    createdVoters.push(...(data ?? []));
  }

  return createdVoters;
}

async function insertVotes(supabase, voters, categories, nomineesByCategoryId, weighted) {
  let createdVoteCount = 0;
  const voteRows = [];

  for (const voter of voters) {
    for (const category of categories) {
      const nominees = nomineesByCategoryId.get(category.id) ?? [];
      const nominee = nominees[chooseIndex(nominees.length, weighted)];
      voteRows.push({
        voter_id: voter.id,
        category_id: category.id,
        nominee_brand_id: nominee.brand_id,
        nominee_perfume_id: nominee.perfume_id,
        ip_hash: null
      });
    }
  }

  for (const batch of chunk(voteRows, 500)) {
    const { error } = await supabase.from("votes").insert(batch);
    if (error) {
      throw error;
    }
    createdVoteCount += batch.length;
  }

  return createdVoteCount;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  loadEnvFile();
  const supabase = createSupabaseAdminClient();
  const { categories, nomineesByCategoryId } = await fetchVotingData(supabase);
  const voters = await insertVoters(supabase, options.voters);
  const voteCount = await insertVotes(
    supabase,
    voters,
    categories,
    nomineesByCategoryId,
    options.weighted
  );

  console.log("Testing-only vote generation complete.");
  console.log(`Created voters: ${voters.length}`);
  console.log(`Created votes: ${voteCount}`);
  console.log(`Categories used: ${categories.map((category) => category.name).join(", ")}`);
  console.log(`Mode: ${options.weighted ? "weighted" : "random"}`);
  console.log("");
  console.log("Cleanup: use the existing 'Reset all event data' action in /admin/settings.");
}

main().catch((error) => {
  console.error("Failed to generate test votes.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
