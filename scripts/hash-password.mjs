import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/hash-password.mjs <password>");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log(`Hash:               ${hash}`);
console.log(`For .env (escaped): ${hash.replaceAll("$", "\\$")}`);
console.log(
  "\nNext.js expands $VAR inside .env files, so paste the escaped version into MASTER_PASSWORD_HASH."
);
