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

// Check if file is uploaded
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'No file uploaded or upload error']);
    exit;
}

$word = $_POST['word'];
$file = $_FILES['file'];

// Validate file type
$allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
if (!in_array($file['type'], $allowed_types)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid file type. Only JPG, PNG and GIF are allowed']);
    exit;
}

// Create img directory if it doesn't exist
$upload_dir = 'img/';
if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0755, true);
}

// Determine file extension and new filename
$file_extension = pathinfo($file['name'], PATHINFO_EXTENSION);
$new_filename = $word . '.' . $file_extension;
$upload_path = $upload_dir . $new_filename;

// Upload file
if (move_uploaded_file($file['tmp_name'], $upload_path)) {
    // Update database
    $stmt = $conn->prepare("UPDATE wordfrequency SET image_file = ?, image_checked = 1 WHERE word = ?");
    $stmt->bind_param("ss", $new_filename, $word);
    
    if ($stmt->execute()) {
        // Success
        echo json_encode([
            'success' => true,
            'file' => $new_filename,
            'path' => $upload_path
        ]);
    } else {
        // Database update error
        http_response_code(500);
        echo json_encode([
            'error' => 'Database update failed: ' . $conn->error
        ]);
    }
    
    $stmt->close();
} else {
    // File upload error
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to move uploaded file'
    ]);
}
