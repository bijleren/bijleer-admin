<?php
require_once 'db_config.php';
?>
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <title>Controleer Betekenissen</title>
  <p><a href="https://instructielezen.be/data.php">naar menu</a></p>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 2rem;
      background: #f5f5f5;
      color: #333;
    }
    h1 {
      text-align: center;
    }
    #container {
      max-width: 600px;
      margin: auto;
      background: white;
      padding: 2rem;
      border-radius: 1rem;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    .word-display {
      font-size: 2rem;
      font-weight: bold;
      text-align: center;
      margin: 1.5rem 0;
      color: #2196F3;
    }
    textarea {
      width: 100%;
      padding: 0.8rem;
      font-size: 1.1rem;
      margin-top: 1rem;
      border: 1px solid #ccc;
      border-radius: 0.5rem;
      min-height: 100px;
      resize: vertical;
      font-family: Arial, sans-serif;
    }
    .button-row {
      margin-top: 1.5rem;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    button {
      padding: 1rem 1.5rem;
      font-size: 1rem;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: 0.2s;
      font-weight: bold;
    }
    button:hover {
      opacity: 0.9;
      transform: translateY(-2px);
    }
    .ok { background-color: #4CAF50; color: white; }
    .improve { background-color: #FF9800; color: white; }
    .not-ok { background-color: #f44336; color: white; }
    .skip { background-color: #ccc; }
    #remaining {
      font-weight: bold;
      margin-bottom: 1rem;
      text-align: center;
      font-size: 1.1rem;
    }
    .order-selector {
      margin-top: 1.5rem;
      text-align: center;
      padding: 1rem;
      background: #f9f9f9;
      border-radius: 0.5rem;
      border: 1px solid #e0e0e0;
    }
    .order-selector label {
      margin-right: 1.5rem;
      font-size: 1rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
    }
    .order-selector input[type="radio"] {
      margin-right: 0.5rem;
      cursor: pointer;
      width: 18px;
      height: 18px;
    }
  </style>
</head>
<body>
  <div id="container">
    <h1>Controleer Betekenissen</h1>
    <div id="remaining">Nog te controleren: ...</div>
    
    <div id="wordBox">
      <div class="word-display" id="wordText">...</div>
      <div><strong>Betekenis:</strong></div>
      <textarea id="betekenisInput" placeholder="Voer betekenis in"></textarea>
    </div>
    <div class="button-row">
      <button class="ok" onclick="saveBetekenis(1)">✅ OK</button>
      <button class="improve" onclick="saveBetekenis(2)">🔧 Improve</button>
      <button class="not-ok" onclick="saveBetekenis(0)">❌ Not OK</button>
      <button class="skip" onclick="loadWord()">⏭ Skip</button>
    </div>
    
    <div class="order-selector">
      <label>
        <input type="radio" name="wordOrder" value="random" checked onchange="loadWord()">
        🎲 Willekeurig
      </label>
      <label>
        <input type="radio" name="wordOrder" value="shortest" onchange="loadWord()">
        📏 Kortste eerst
      </label>
    </div>
  </div>

<script>
let currentId = null;

function getSelectedOrder() {
  const selected = document.querySelector('input[name="wordOrder"]:checked');
  return selected ? selected.value : 'random';
}

function loadWord() {
  const order = getSelectedOrder();
  fetch('get_betekenis_word.php?order=' + order)
    .then(res => res.json())
    .then(data => {
      if (!data || !data.id) {
        document.getElementById('wordText').textContent = 'Alles is gecontroleerd 🎉';
        document.getElementById('betekenisInput').value = '';
        return;
      }
      currentId = data.id;
      document.getElementById('wordText').textContent = data.word;
      document.getElementById('betekenisInput').value = data.betekenis || '';
      document.getElementById('betekenisInput').focus();
      updateRemaining();
    });
}

function saveBetekenis(checkValue) {
  const betekenis = document.getElementById('betekenisInput').value;
  fetch('betekenis_update.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'id=' + currentId + 
          '&betekenis=' + encodeURIComponent(betekenis) + 
          '&betekenis_check=' + checkValue
  }).then(() => {
    loadWord();
    updateRemaining();
  });
}

function updateRemaining() {
  fetch('get_betekenis_remaining_count.php')
    .then(res => res.text())
    .then(count => {
      document.getElementById('remaining').textContent = 'Nog te controleren: ' + count;
    });
}

loadWord();
updateRemaining();
</script>
</body>
</html>
