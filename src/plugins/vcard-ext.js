import fs from 'fs';
import yaml from 'js-yaml';
import vCardsJS from 'vcards-js';
import { execSync } from 'child_process';

function safeGitLog(filePath) {
  try {
    // 检查是否在 Git 仓库中
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    return execSync(`git log -1 --pretty="format:%ci" "${filePath}"`, { encoding: 'utf-8' }).trim().replace(/\s\+\d+/, '');
  } catch (error) {
    // 如果不是 Git 仓库或文件无提交记录，返回默认时间
    console.warn(`Git log failed for ${filePath}: ${error.message}`);
    return '1970-01-01 00:00:00';
  }
}

const plugin = (file, _, cb) => {
  const path = file.path;
  const data = fs.readFileSync(path, 'utf8');
  const json = yaml.load(data);

  let vCard = vCardsJS();
  vCard.isOrganization = true;

  for (const [key, value] of Object.entries(json.basic)) {
    vCard[key] = value;
  }

  if (!vCard.uid) {
    vCard.uid = vCard.organization;
  }

  vCard.photo.embedFromFile(path.replace('.yaml', '.png'));

  // 安全获取 YAML 和 PNG 的最后修改时间
  let lastYamlChangeDateString = safeGitLog(path);
  let lastPngChangeDateString = safeGitLog(path.replace('.yaml', '.png'));

  // 取两个时间的最大值作为 REV 时间
  let rev = new Date(Math.max(new Date(lastYamlChangeDateString), new Date(lastPngChangeDateString))).toISOString();

  // 替换 REV 字段
  let formatted = vCard.getFormattedString();
  formatted = formatted.replace(/REV:[\d\-:T\.Z]+/, 'REV:' + rev);

  file.contents = Buffer.from(formatted);
  cb(null, file);
};

export default plugin;
