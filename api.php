<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

try {
    $db = new PDO('sqlite:justfornow.db');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Accounts Table
    $db->exec("CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )");

    // Posts Table
    $db->exec("CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        item TEXT NOT NULL,
        cat TEXT NOT NULL,
        time TEXT,
        note TEXT,
        name TEXT NOT NULL,
        room TEXT NOT NULL,
        pin TEXT NOT NULL,
        resolved INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Database failure: ' . $e->getMessage()]);
    exit;
}

$action = $_GET['action'] ?? '';

// Sign Up Endpoint
if ($action === 'register') {
    $input = json_decode(file_get_contents('php://input'), true);
    $user = trim($input['username'] ?? '');
    $pass = trim($input['password'] ?? '');

    if (!$user || !$pass) {
        echo json_encode(['success' => false, 'error' => 'Fill in both username and password.']);
        exit;
    }

    try {
        $stmt = $db->prepare("INSERT INTO users (username, password) VALUES (:u, :p)");
        $stmt->execute([':u' => $user, ':p' => password_hash($pass, PASSWORD_BCRYPT)]);
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => 'Username is already taken.']);
    }
    exit;
}

// Log In Endpoint
if ($action === 'login') {
    $input = json_decode(file_get_contents('php://input'), true);
    $user = trim($input['username'] ?? '');
    $pass = trim($input['password'] ?? '');

    $stmt = $db->prepare("SELECT * FROM users WHERE username = :u");
    $stmt->execute([':u' => $user]);
    $account = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($account && password_verify($pass, $account['password'])) {
        echo json_encode(['success' => true, 'username' => $account['username']]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Invalid username or password.']);
    }
    exit;
}

// Fetch Board Items
if ($action === 'fetch') {
    $stmt = $db->query("SELECT id, type, item, cat, time, note, name, room, resolved FROM posts ORDER BY resolved ASC, id DESC");
    $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($posts as &$post) {
        $post['resolved'] = (bool)$post['resolved'];
        $post['id'] = (int)$post['id'];
    }
    echo json_encode(['success' => true, 'data' => $posts]);
    exit;
}

// Create Note
if ($action === 'create') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || empty($input['item']) || empty($input['name']) || empty($input['room']) || empty($input['pin'])) {
        echo json_encode(['success' => false, 'error' => 'Missing required fields.']);
        exit;
    }

    $stmt = $db->prepare("INSERT INTO posts (type, item, cat, time, note, name, room, pin) VALUES (:type, :item, :cat, :time, :note, :name, :room, :pin)");
    $result = $stmt->execute([
        ':type' => $input['type'],
        ':item' => $input['item'],
        ':cat'  => $input['cat'],
        ':time' => $input['time'],
        ':note' => $input['note'],
        ':name' => $input['name'],
        ':room' => $input['room'],
        ':pin'  => password_hash($input['pin'], PASSWORD_BCRYPT)
    ]);

    echo json_encode(['success' => $result]);
    exit;
}

// Delete Note via PIN
if ($action === 'delete') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? null;
    $pin = $input['pin'] ?? '';

    $stmt = $db->prepare("SELECT pin FROM posts WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $post = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($post && password_verify($pin, $post['pin'])) {
        $delStmt = $db->prepare("DELETE FROM posts WHERE id = :id");
        $delStmt->execute([':id' => $id]);
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Incorrect deletion PIN.']);
    }
    exit;
}

// Claim Item
if ($action === 'claim') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? null;

    $stmt = $db->prepare("UPDATE posts SET resolved = 1 WHERE id = :id");
    $stmt->execute([':id' => $id]);
    echo json_encode(['success' => true]);
    exit;
}