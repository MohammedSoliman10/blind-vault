import { rootNodeFromAnchor } from "@codama/nodes-from-anchor";
import { createFromRoot } from "codama";
import { renderVisitor } from "@codama/renderers-js";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Generating typed TypeScript client targeting @solana/kit via Codama...");

  const idlPath = path.resolve(process.cwd(), "target/idl/blind_vault.json");
  if (!fs.existsSync(idlPath)) {
    throw new Error(`IDL file not found at ${idlPath}. Run 'anchor build' first.`);
  }

  const outputDir = path.resolve(process.cwd(), "lib/solana/generated");

  // Read Anchor IDL
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));

  // Convert Anchor IDL to Codama AST
  const root = rootNodeFromAnchor(idl);
  const codama = createFromRoot(root);

  // Render TypeScript client using @solana/kit bindings
  codama.accept(
    renderVisitor(outputDir, {
      generatedFolder: "",
      deleteFolderBeforeRendering: true,
    })
  );

  // Remove generated package.json so the monorepo root package.json governs
  const nestedPkgJson = path.join(outputDir, "package.json");
  if (fs.existsSync(nestedPkgJson)) {
    fs.unlinkSync(nestedPkgJson);
  }

  console.log(`✓ Codama TypeScript client successfully generated in ${outputDir}/index.ts`);
}

main().catch((err) => {
  console.error("FATAL ERROR in generate-client:", err);
  process.exit(1);
});
