export function templatePromptAnswer({
  question,
}: {
  question: string
}) {
  // TODO: improve the prompt to make it more accurate.

  return [
    {
      role: 'system' as const,
      content: `You are a helpful assistant. Check your knowledge base before answering any questions.
Only respond to questions using information from tool calls.
if no relevant information is found in the tool calls, respond, "Sorry, I don't know."`,
    },
    {
      role: 'user' as const,
      content: `Question: ${question}`,
    },
  ]
}

// export function templatePromptWriteQuery({
//   schema,
//   queryExamples,
//   question,
// }: {
//   schema: string
//   queryExamples: string
//   question: string
// }) {
//   // TODO: improve the prompt to make it more accurate.

//   const dialect = 'DuckDB' as const

//   return [
//     {
//       role: 'system' as const,
//       content: `You are a helpful assistant.

// Write a query to get the data.

// Dialect: ${dialect}

// Schema:
// ${schema}

// Query Examples:
// ${queryExamples}`,
//     },
//     {
//       role: 'user' as const,
//       content: `Question: ${question}`,
//     },
//   ]
// }

// export function templatePromptQueryEnhancementWithProperNouns({
//   query,
// }: {
//   query: string
// }) {
//   // TODO: improve the prompt to make it more accurate.

//   return [
//     {
//       role: 'system' as const,
//       content: `You are an assistant that helps to find the proper nouns in a query.

// 1. Extract all literal string values from the query (values between single quotes, e.g., 'Brazil').
// 2. For each unique literal string value, call the function \`searchProperNouns({ tableName, columnName, search })\` to validate or correct the value.
//     - Do this only for string literals, not table names or column names.
//     - Skip repeated values; validate each unique string only once.
// 3. Replace the original literal string in the query with the result returned by \`searchProperNouns\`.

// Return "properNouns" with the proper nouns replaced. Example:
// Query: \`SELECT * FROM "region_country" WHERE "name" = 'Brazil' OR "name" = 'United States';\`
// Proper nouns: \`Brasil → Brazil, Estados Unidos → United States\``,
//     },
//     {
//       role: 'user' as const,
//       content: `Query:
// ${query}`,
//     },
//   ]
// }

// /**
//  * Experimental. Do not use this prompt in production.
//  */
// export function experimental_templatePromptSummarizeDatabaseSource({
//   content,
// }: {
//   content: string
// }) {
//   // TODO: improve the prompt to make it more accurate.

//   return [
//     {
//       role: 'system' as const,
//       content: `You are an expert at creating precise, structured summaries of database schema information for semantic search and retrieval.

// Your task is to analyze the provided table information and create a comprehensive, well-structured summary that captures:
// 1. The semantic meaning and purpose of each table
// 2. Key relationships between tables (foreign keys, joins)
// 3. Important columns and their data types
// 4. Business context and domain knowledge

// Guidelines for creating effective summaries:
// - Use clear, descriptive language that captures the business domain
// - Include relevant keywords and terminology that users might search for
// - Highlight relationships and dependencies between tables
// - Mention data types and constraints that are semantically important
// - Focus on what each table represents in the real world
// - Include any business rules or domain-specific information
// - Use consistent terminology throughout the summary

// The summary should be structured to help a vector search system find the most relevant schema information when users ask questions in natural language.

// Format your response as a clear, well-organized summary that would be useful for semantic search and retrieval.`,
//     },
//     {
//       role: 'user' as const,
//       content: `Input:
// ${content}`,
//     },
//   ]
// }
