#!/usr/bin/env node

const { sprintf, printf } = require('printfy');
const targetDir = process.cwd();
const fs = require('fsmate');
const path = require('path');
const templateDir = path.join(__dirname, "..", "template");
const readline = require('readline');

const packageFile = 'package.json';
const types = {
  project: true,
  library: true,
};

let type = process.argv[3] || process.argv[2] || process.argv[1];
let package = {};

if (fs.isFileSync(packageFile)) {
  package = fs.readFileSync(packageFile, true);
}

// Throwing error if type is missing.
if (type == null) {
  throw new Error('Missing type [project, library]');
}

// Throwing error if type is unsupported.
if (!types[type]) {
  throw new Error(sprintf('Unsupported type [%s]', type));
}

const deafultName = package.name || path.basename(targetDir);
const defaultVersion = package.version || '1.0.0';
const defaultLicense = package.license || 'MIT';
const defaultEntry = package.main || path.basename(__filename);
let packageLink = (package.repository || '').url || '';

// Readline interface for take user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function autoLoadDependecies() {
  const lockFile = 'package-lock.json';

  if (fs.isFileSync(lockFile)) {
    const lockData = fs.readFileSync(lockFile, true);
    const packages = lockData.packages[""];
    const devDependencies = packages.devDependencies;
    const dependencies = packages.dependencies;
    
    if (dependencies) {
      package.dependencies = dependencies;
    }

    if (devDependencies) {
      package.devDependencies = devDependencies;
    }
  }
}

function complete() {
  let files = fs.scandirSync(templateDir, {withFullPath: true});

  for(let file of files) {
    if (fs.isFileSync(file)) {
      fs.copySync(file, path.join(targetDir, path.basename(file)));
    } else if (type === path.basename(file)) {
      fs.mirrorSync(file, targetDir);
    }
  }

  if (type === 'library') {
    const {name, description, license, author} = package;
    packageLink
    const data = sprintf(`/**
     * %s
     * %s
     * %s
     * 
     * @license %s
     * @author %s
     * 
     * Date %s
     */`, name, description, packageLink || '', license, author, new Date).replace(/\n\x20+/g, "\n\x20");
    fs.dumpFileSync(path.join(templateDir, sprintf('/library/%s.js', package.main)), data);
  }
  
  fs.writeFileSync(packageFile, package);
  printf('✓ %s [%s] has been created successfully!', type, package.name);
  rl.close();
}

function addLicense(license) {
  const json = JSON.stringify(package, null, 2);
  package.license = license || defaultLicense;

  // Complete!
  rl.question(sprintf(
    'About to write to %s:\n%s\n\nIs this OK? (yes) ',
    path.join(targetDir, packageFile),
    json
  ), complete);
}

function addHomePageAndBugs(repo) {
  if (repo) {
    try {
      let origin, url = new URL(repo.url.replace(/^git\+/, ''));

      if ((origin = url.origin)) {
        package.homepage = origin + path.dirname(url.pathname);
        packageLink = origin + url.pathname;
        package.bugs = {url: packageLink.replace(/\.git$/, '/issues')};
        packageLink = packageLink.replace(/\.git$/, '');
      }
    } catch(e) {}
  } 
}

function addAuthor(author) {
  package.author = author || '';

  rl.question(sprintf('license: (%s) ', defaultLicense), addLicense);
  addHomePageAndBugs(package.repository);
  autoLoadDependecies();
}

function addKeywords(keywords) {
  if (keywords) {
    package.keywords = keywords.split(/,?\x20/);
  }
  
  if (!package.author) {
    rl.question('author: ', addAuthor);
  }
}

function addRepo(repo) {
  if (repo) {
    package.repository = {
      type: 'git',
      url: sprintf('git+%s', repo)
    };
  }

  if (!package.keywords) {
    rl.question('keywords: ', addKeywords);
  } else {
    rl.question(sprintf('license: (%s) ', defaultLicense), addLicense);
  }
}

function addBuild(build) {
  package.scripts.build = build || 'echo "No build required"';
  rl.question('git repository: ', addRepo);
}

function addTest(test) {
  test = test || "echo \"Error: no test specified\" && exit 1";
  package.scripts = {test};
  rl.question('build command: ', addBuild);
}

function addEntry(entry) {
  package.main = entry || defaultEntry;
  
  if (!package.scripts) {
    rl.question('test command: ', addTest);
  } else {
    rl.question('git repository: ', addRepo);
  }
}

function addDescription(description) {
  package.description = description;
  
  if (!package.main) {
    rl.question(sprintf('entry point: (%s) ', defaultEntry), addEntry);
  } else if (!package.repository) {
    rl.question('git repository: ', addRepo);
  } else {
    rl.question(sprintf('license: (%s) ', defaultLicense), addLicense);
  }
}

function addVersion(version) {
  package.version = version || defaultVersion;
  
  if (!package.description) {
    rl.question(sprintf('description: '), addDescription);
  } else if (!package.repository) {
    rl.question('git repository: ', addRepo);
  } else {
    rl.question(sprintf('license: (%s) ', defaultLicense), addLicense);
  }
}

function addName(name) {
  package.name = (name || deafultName).toLowerCase();
  rl.question(sprintf('version: (%s) ', defaultVersion), addVersion);
}

rl.question(sprintf('%s name: (%s) ', type, deafultName), addName);
