<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

if (!isset($_POST['word']) || empty($_POST['word'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No word specified']);
    exit;
}

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    $error_message = 'No file uploaded';
    if (isset($_FILES['file']['error'])) {
        switch ($_FILES['file']['error']) {
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                $error_message = 'File too large';
                break;
            case UPLOAD_ERR_PARTIAL:
                $error_message = 'File upload incomplete';
                break;
        }
    }
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $error_message]);
    exit;
}

$word = $_POST['word'];
$file = $_FILES['file'];

$allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
$allowed_extensions = ['jpg', 'jpeg', 'png', 'gif'];

$file_type = strtolower($file['type']);
$file_extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

if (!in_array($file_type, $allowed_types) || !in_array($file_extension, $allowed_extensions)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid file type. Only JPG, PNG and GIF are allowed']);
    exit;
}

$max_file_size = 5 * 1024 * 1024;
if ($file['size'] > $max_file_size) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'File too large. Maximum size is 5MB']);
    exit;
}

$upload_dir = __DIR__ . '/../img/';
if (!file_exists($upload_dir)) {
    if (!mkdir($upload_dir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to create upload directory']);
        exit;
    }
}

$safe_word = preg_replace('/[^a-zA-Z0-9_-]/', '_', $word);
$new_filename = $safe_word . '.' . $file_extension;
$upload_path = $upload_dir . $new_filename;

if (move_uploaded_file($file['tmp_name'], $upload_path)) {
    chmod($upload_path, 0644);

    echo json_encode([
        'success' => true,
        'filename' => $new_filename,
        'path' => 'img/' . $new_filename,
        'word' => $word
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to save uploaded file'
    ]);
}
