<?php
    $hostname = gethostname(); // <-- Huomaa, ETTÄ KENOVAIHVA ON POIS
    echo "<h1>Formassist toimii!</h1>";
    echo "<p>PHP toimii Docker-kontissa: <strong>$hostname</strong></p>";
    echo "<p>Olen kansiossa: " . __DIR__ . "</p>";
?>