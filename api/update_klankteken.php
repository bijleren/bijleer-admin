<?php
require_once 'db_config.php';
header('Content-Type: text/html; charset=utf-8');
// Fetch all words from the database

// Ensure proper encoding
$conn->query("SET NAMES 'utf8mb4'");
$stmt = $conn->query("SET NAMES 'utf8mb4'");
$stmt = $conn->query("SELECT id, word FROM wordfrequency WHERE klankteken_checked = 0");
$words = $stmt->fetch_all(MYSQLI_ASSOC);

// Define phoneme patterns
$tripleVowels = ['aai', 'ooi', 'oei', 'ieu', 'eeu'];
$doubleVowels = ['ie', 'ei', 'ui', 'ij', 'ou', 'eu', 'oe', 'au', 'ea'];
$longVowels = ['aa', 'ee', 'uu', 'oo'];
$doubleConsonants = ['zz', 'rr', 'tt', 'pp', 'ss', 'dd', 'ff', 'gg', 'kk', 'll', 'mm', 'ww', 'vv', 'bb', 'nn'];
$consonantClusters = ['sch', 'ch', 'ng', 'nk', 'th', 'dt'];
$vowels = ['a', 'e', 'i', 'o', 'u'];
$accentedVowels = ['é', 'è', 'à', 'ö', 'ë', 'ï'];
$consonants = str_split('bcdfghjklmnpqrstvwxyz');

// Helper functions
function isPrefix($word, $prefix) {
    return strpos($word, $prefix) === 0;
}

function isSuffix($word, $suffix) {
    return substr($word, -strlen($suffix)) === $suffix;
}

function analyzeWord($word) {
    global $tripleVowels, $doubleVowels, $longVowels, $doubleConsonants, $consonantClusters, $vowels, $accentedVowels, $consonants;

    $detectedPhonemes = [];
    $word = mb_convert_encoding($word, 'UTF-8', 'auto');
    if (class_exists('Normalizer')) {
        $word = Normalizer::normalize($word, Normalizer::FORM_C);
    }
    $word = strtolower(preg_replace('/[.!?]/', '', $word));
    $i = 0;
    $length = strlen($word);

    // Rule: Handle words with only one vowel 'e'
    $vowelCount = 0;
    foreach (str_split($word) as $char) {
        if (in_array($char, $vowels)) {
            $vowelCount++;
        }
    }
    if ($vowelCount === 1 && strpos($word, 'e') !== false && !in_array($word, ['het', 'de'])) {
        // Return the word with 'e' preserved as-is
        return implode('-', str_split($word));
    }

    while ($i < $length) {
        $found = false;

        // STEP 1: Check Triple Vowels
        foreach ($tripleVowels as $cluster) {
            if (substr($word, $i, 3) === $cluster) {
                $detectedPhonemes[] = $cluster;
                $i += 3;
                if (isset($word[$i]) && $word[$i] === 'e') {
                    $detectedPhonemes[] = 'doffe';
                    $i++;
                }
                $found = true;
                break;
            }
        }
        if ($found) continue;

        // STEP 2: Double Vowels
        foreach ($doubleVowels as $cluster) {
            if (substr($word, $i, 2) === $cluster) {
                $detectedPhonemes[] = $cluster;
                $i += 2;
                $found = true;
                break;
            }
        }
        if ($found) continue;

        // STEP 3: Long Vowels
        foreach ($longVowels as $lvowel) {
            if (substr($word, $i, 2) === $lvowel) {
                $detectedPhonemes[] = $lvowel;
                $i += 2;
                $found = true;
                break;
            }
        }
        if ($found) continue;

        // STEP 4: Accented Vowels
        if (in_array($word[$i], $accentedVowels)) {
            $detectedPhonemes[] = $word[$i];
            $i++;
            continue;
        }

        // STEP 5: Double Consonants
        foreach ($doubleConsonants as $dc) {
            if (substr($word, $i, 2) === $dc) {
                $detectedPhonemes[] = $dc;
                $i += 2;
                $found = true;
                break;
            }
        }
        if ($found) continue;

        // STEP 6: Consonant Clusters
        foreach ($consonantClusters as $cc) {
            if (substr($word, $i, strlen($cc)) === $cc) {
                $detectedPhonemes[] = $cc;
                $i += strlen($cc);
                $found = true;
                break;
            }
        }
        if ($found) continue;

        // STEP 7: Handle 'c' and 'cc'
        if (substr($word, $i, 2) === 'cc') {
            if (isset($word[$i + 2]) && in_array($word[$i + 2], ['e', 'i'])) {
                $detectedPhonemes[] = 'calsk';
                $detectedPhonemes[] = 'calss';
            } else {
                $detectedPhonemes[] = 'calsk';
                $detectedPhonemes[] = 'calsk';
            }
            $i += 2;
            continue;
        }
        if ($word[$i] === 'c') {
            $detectedPhonemes[] = (isset($word[$i + 1]) && in_array($word[$i + 1], ['e', 'i'])) ? 'calss' : 'calsk';
            $i++;
            continue;
        }

        // STEP 8: Handle 'd' at the end of the word → 'dalst'
        if ($word[$i] === 'd') {
            $detectedPhonemes[] = ($i === $length - 1) ? 'dalst' : 'd';
            $i++;
            continue;
        }

        // STEP 9: Handle 'g' at the end of the word → 'galsch'
        if ($word[$i] === 'g' && $i === $length - 1) {
            $detectedPhonemes[] = 'galsch';
            $i++;
            continue;
        }

        // STEP 10: Vowel + Consonant + 'e' → Long Vowel + 'doffe'
        if (in_array($word[$i], $vowels) && isset($word[$i + 1]) && in_array($word[$i + 1], $consonants) && ($word[$i + 2] ?? '') === 'e') {
            $mapping = ['a' => 'aalsaa', 'o' => 'oalsoo', 'u' => 'ualsuu', 'e' => 'ealsee'];
            $detectedPhonemes[] = $mapping[$word[$i]];
            $detectedPhonemes[] = $word[$i + 1];
            $detectedPhonemes[] = 'doffe';
            $i += 3;
            continue;
        }

        // STEP 11: Handle '-en' ending → 'doffe' + 'n'
        if (isSuffix($word, 'en') && $i === $length - 2) {
            $detectedPhonemes[] = 'doffe';
            $detectedPhonemes[] = 'n';
            break;
        }

        // STEP 12: Final 'e' as 'doffe'
        if ($word[$i] === 'e' && $i === $length - 1) {
            $detectedPhonemes[] = 'doffe';
            $i++;
            continue;
        }

        // Fallback
        $detectedPhonemes[] = $word[$i];
        $i++;
    }

    return implode('-', $detectedPhonemes);
}
// Prepare SQL update statement
$updateStmt = $conn->prepare("UPDATE wordfrequency SET klankteken = ? WHERE id = ?");

// Process each word in the database
foreach ($words as $row) {
    $phonemes = analyzeWord($row['word']);
    $updateStmt->bind_param('si', $phonemes, $row['id']);
    $updateStmt->execute();

    echo "✅ '{$row['word']}' updated to '{$phonemes}'<br>";
}

echo "<br>🎉 All words have been updated.";
?>