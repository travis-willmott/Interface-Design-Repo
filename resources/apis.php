<?php
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$request = explode('/', trim($_SERVER['PATH_INFO'] ?? '', '/'));
$input = json_decode(file_get_contents('php://input'), true);

$conn = mysqli_connect('localhost', 'root', '', 'gamebench');

if (!$conn) {
    http_response_code(500);
    echo json_encode(['error' => mysqli_connect_error()]);
    exit;
}

mysqli_set_charset($conn, 'utf8');

$table = preg_replace('/[^a-z0-9_]+/i', '', array_shift($request));
$fld = preg_replace('/[^a-z0-9_]+/i', '', array_shift($request));
$key = array_shift($request);

if (!$fld) {
    $fld = 'id';
}

$allowedTables = ['games', 'reviews', 'users'];

if (!in_array($table, $allowedTables)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid table']);
    exit;
}

if (isset($input)) {
    $columns = preg_replace('/[^a-z0-9_]+/i', '', array_keys($input));

    $values = array_map(function ($value) use ($conn) {
        if ($value === null) return null;
        return mysqli_real_escape_string($conn, (string)$value);
    }, array_values($input));

    $set = '';

    for ($i = 0; $i < count($columns); $i++) {
        $set .= ($i > 0 ? ',' : '') . '`' . $columns[$i] . '`=';
        $set .= ($values[$i] === null ? 'NULL' : '"' . $values[$i] . '"');
    }
}

switch ($method) {
    case 'GET':
        $sql = "SELECT * FROM `$table`" . ($key ? " WHERE `$fld`='$key'" : "");
        break;

    case 'POST':
        $sql = "INSERT INTO `$table` SET $set";
        break;

    case 'PUT':
        $sql = "UPDATE `$table` SET $set WHERE `$fld`='$key'";
        break;

    case 'DELETE':
        $sql = "DELETE FROM `$table` WHERE `$fld`='$key'";
        break;
}

$result = mysqli_query($conn, $sql);

if ($result) {
    if ($method === 'GET') {
        $rows = [];

        while ($row = mysqli_fetch_assoc($result)) {
            $rows[] = $row;
        }

        echo json_encode($rows);
    } elseif ($method === 'POST') {
        echo json_encode(['id' => mysqli_insert_id($conn)]);
    } else {
        echo json_encode(['affectedRows' => mysqli_affected_rows($conn)]);
    }
} else {
    http_response_code(500);
    echo json_encode(['error' => mysqli_error($conn)]);
}

mysqli_close($conn);
?>