<?php
require_once 'db_config.php';

// Check if request is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Check if word parameter is provided
if (!isset($_POST['word']) || empty($_POST['word'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No word specified']);
    exit;
}

$word = $_POST['word'];

// Update database to mark word as checked and not needing an image
$stmt = $conn->prepare("UPDATE wordfrequency SET image_checked = 1 WHERE word = ?");
$stmt->bind_param("s", $word);

if ($stmt->execute()) {
    // Success
    echo json_encode([
        'success' => true,
        'message' => 'Word marked as no image possible'
    ]);
} else {
    // Database update error
    http_response_code(500);
    echo json_encode([
        'error' => 'Database update failed: ' . $conn->error
    ]);
}

$stmt->close();
