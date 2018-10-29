const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const fetch = require('node-fetch');
const dialog = require('dialog');
const svn = require('node-svn-ultimate');

const travisUrl = 'https://ci.kolmafia.us/job/Kolmafia/';
const svnUrl = 'https://svn.code.sf.net/p/kolmafia/code/';
const program = path.join(process.env.HOME, '/.kolmafia/program');

async function main() {
  let current;
  try {
    current = (await fs.readdir(program)).sort((a, b) => b - a)[0] || 0;
  } catch (error) {
    await fs.mkdir(program);
    current = 0;
  }

  const htmlResponse = await fetch(travisUrl);
  const html = await htmlResponse.text();

  const [, link, version] = html.match(/<a href="(lastSuccessfulBuild\/artifact\/dist\/KoLmafia-(\d+)\.jar)">/);

  if (Number(version) > current) {
    const fileResponse = await fetch(`${travisUrl}${link}`);
    const file = await fileResponse.buffer();

    await fs.writeFile(path.join(program, version), file);
    if (current > 0) await fs.unlink(path.join(program, current));

    svn.commands.log(svnUrl, { revision: `${current}:${version}` }, (err, log) => {
      if (err) return;
      const textLog = log.logentry.map(l => `[${l.$.revision}] ${l.msg.trim()}`).join('\n');
      dialog.info(textLog, 'KoLmafia changelog');
    });

    current = version;
  }

  const jarPath = path.join(program, current);

  const child = spawn('java', ['-jar', jarPath]);

  child.stderr.on('data', d => process.stderr.write(d));
}

main();
