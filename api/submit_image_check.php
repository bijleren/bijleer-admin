<?php
require_once 'db_config.php';

$id = (int)($_POST['id'] ?? 0);
$image_file = trim($_POST['image_file'] ?? '');
$image_checked = isset($_POST['image_checked']) ? 1 : 0;
$filter = $_POST['filter'] ?? 'shortest';

if ($id > 0) {
    $stmt = $conn->prepare("UPDATE wordfrequency SET image_file = ?, image_checked = ? WHERE id = ?");
    $stmt->bind_param("sii", $image_file, $image_checked, $id);
    $stmt->execute();
}

header("Location: check_image.php?filter=" . urlencode($filter));
exit;