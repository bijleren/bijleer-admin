const tripleVowels = ['aai', 'ooi', 'oei', 'ieu', 'eeu'];
const doubleVowels = ['ie', 'ei', 'ui', 'ij', 'ou', 'eu', 'oe', 'au', 'ea', 'ai'];
const longVowels = ['aa', 'ee', 'uu', 'oo'];
const doubleConsonants = ['zz', 'rr', 'tt', 'pp', 'ss', 'dd', 'ff', 'gg', 'kk', 'll', 'mm', 'ww', 'vv', 'bb', 'nn'];
const consonantClusters = ['sch', 'ch', 'nk', 'th', 'dt'];
const vowels = ['a', 'e', 'i', 'o', 'u'];
const accentedVowels = ['é', 'è', 'à', 'ö', 'ë', 'ï'];
const consonants = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z'];

function isSuffix(word: string, suffix: string): boolean {
  return word.endsWith(suffix);
}

export function analyzeWord(word: string): string {
  const detectedPhonemes: string[] = [];

  word = word.toLowerCase().replace(/[.!?]/g, '');

  let vowelCount = 0;
  for (const char of word) {
    if (vowels.includes(char)) {
      vowelCount++;
    }
  }

  if (vowelCount === 1 && word.includes('e') && word !== 'het' && word !== 'de') {
    return word.split('').join('-');
  }

  let i = 0;
  const length = word.length;

  while (i < length) {
    let found = false;

    if (word.substring(i, i + 2) === 'ge' && (i === 0 || i === 2 || i === 3)) {
      detectedPhonemes.push('g');
      detectedPhonemes.push('doffe');
      i += 2;
      continue;
    }

    for (const cluster of tripleVowels) {
      if (word.substring(i, i + 3) === cluster) {
        detectedPhonemes.push(cluster);
        i += 3;
        if (word[i] === 'e') {
          detectedPhonemes.push('doffe');
          i++;
        }
        found = true;
        break;
      }
    }
    if (found) continue;

    if (word.substring(i, i + 2) === 'ee') {
      detectedPhonemes.push('ee');
      i += 2;
      continue;
    }

    if (word.substring(i, i + 2) === 'ai') {
      detectedPhonemes.push('aialsij');
      i += 2;
      continue;
    }

    for (const cluster of doubleVowels) {
      if (word.substring(i, i + 2) === cluster) {
        detectedPhonemes.push(cluster);
        i += 2;
        found = true;
        break;
      }
    }
    if (found) continue;

    for (const lvowel of longVowels) {
      if (word.substring(i, i + 2) === lvowel) {
        detectedPhonemes.push(lvowel);
        i += 2;
        found = true;
        break;
      }
    }
    if (found) continue;

    if (accentedVowels.includes(word[i])) {
      detectedPhonemes.push(word[i]);
      i++;
      continue;
    }

    for (const dc of doubleConsonants) {
      if (word.substring(i, i + 2) === dc) {
        detectedPhonemes.push(dc);
        i += 2;
        found = true;
        break;
      }
    }
    if (found) continue;

    if (word.substring(i, i + 2) === 'ng') {
      detectedPhonemes.push('n');
      detectedPhonemes.push('g');
      i += 2;
      continue;
    }

    for (const cc of consonantClusters) {
      if (word.substring(i, i + cc.length) === cc) {
        detectedPhonemes.push(cc);
        i += cc.length;
        found = true;
        break;
      }
    }
    if (found) continue;

    if (word.substring(i, i + 2) === 'cc') {
      if (word[i + 2] && ['e', 'i'].includes(word[i + 2])) {
        detectedPhonemes.push('calsk');
        detectedPhonemes.push('calss');
      } else {
        detectedPhonemes.push('calsk');
        detectedPhonemes.push('calsk');
      }
      i += 2;
      continue;
    }

    if (word[i] === 'c') {
      detectedPhonemes.push((word[i + 1] && ['e', 'i'].includes(word[i + 1])) ? 'calss' : 'calsk');
      i++;
      continue;
    }

    if (word[i] === 'd') {
      detectedPhonemes.push((i === length - 1) ? 'dalst' : 'd');
      i++;
      continue;
    }

    if (word[i] === 'g' && i === length - 1) {
      detectedPhonemes.push('galsch');
      i++;
      continue;
    }

    if (vowels.includes(word[i]) && word[i + 1] && consonants.includes(word[i + 1]) && word[i + 2] === 'e') {
      const mapping: Record<string, string> = {
        'a': 'aalsaa',
        'o': 'oalsoo',
        'u': 'ualsuu',
        'e': 'ealsee'
      };
      detectedPhonemes.push(mapping[word[i]]);
      detectedPhonemes.push(word[i + 1]);
      detectedPhonemes.push('doffe');
      i += 3;
      continue;
    }

    if (isSuffix(word, 'en') && i === length - 2) {
      detectedPhonemes.push('doffe');
      detectedPhonemes.push('n');
      break;
    }

    if (word[i] === 'e' && i === length - 1) {
      detectedPhonemes.push('doffe');
      i++;
      continue;
    }

    detectedPhonemes.push(word[i]);
    i++;
  }

  return detectedPhonemes.join('-');
}
