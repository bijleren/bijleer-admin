<?php
require_once 'db_config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = intval($_POST['id']);
    $image_checked = intval($_POST['image_checked']);
    
    $stmt = $conn->prepare("UPDATE wordfrequency SET image_checked = ? WHERE id = ?");
    $stmt->bind_param("ii", $image_checked, $id);
    $stmt->execute();
    $stmt->close();
    
    echo json_encode(['success' => true]);
}

$conn->close();
?>
