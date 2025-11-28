const { exec } = require("child_process");

exec("deploy.bat", (error, stdout, stderr) => {
  if (error) {
    console.error(`Erro: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Stderr: ${stderr}`);
    return;
  }
  console.log(`Saída:\n${stdout}`);
});
