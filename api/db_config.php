<?php
// Toon fouten voor debug
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Databaseconfiguratie
$host = "ID377597_bijleren.db.webhosting.be";
$username = "ID377597_bijleren";
$password = "Databank2024!";
$database = "ID377597_bijleren";

// Verbind met database
$conn = new mysqli($host, $username, $password, $database);

// Controleer op fouten
if ($conn->connect_error) {
    die("Fout bij verbinden met database: " . $conn->connect_error);
}
?>
