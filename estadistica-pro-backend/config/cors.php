<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    */

    // 1. Incluimos 'login' y 'api/*' en las rutas procesadas por CORS
    'paths' => ['api/*', 'login', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // 2. Definimos los orígenes explícitos (sin el wildcard "*")
    'allowed_origins' => [
        'http://localhost:8002',
        'http://127.0.0.1:8002',
        'http://192.168.100.75:8002',
    ],

    // 3. Usamos un patrón regex para permitir cualquier otra IP local en el puerto 8002
    'allowed_origins_patterns' => [
        '/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:8002$/',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];