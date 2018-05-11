<?php

require __DIR__ . "/vendor/autoload.php";

// Non-blocking server implementation based on amphp/socket keeping track of connections.

use Amp\Loop;
use Amp\Socket\ServerSocket;
use Twifty\Server\Interpreter;
use function Amp\asyncCall;

Loop::run(function () {
    $server = new class {
        private $clients = [];

        public function __construct () {
            $this->host = getenv('PHP_INTERPRETER_HOST') ?: '127.0.0.1';
            $this->port = getenv('PHP_INTERPRETER_PORT') ?: '1337';
            $this->debug = getenv('PHP_INTERPRETER_DEBUG') ?: false;

            $this->uri = sprintf('tcp://%s:%s', $this->host, $this->port);
        }

        public function listen() {
            asyncCall(function () {
                $server = Amp\Socket\listen($this->uri);

                print "Listening on " . $server->getAddress() . " ..." . PHP_EOL;

                while ($socket = yield $server->accept()) {
                    $this->handleClient($socket);
                }
            });
        }

        private function handleClient(ServerSocket $socket) {
            asyncCall(function () use ($socket) {
                $remoteAddr = $socket->getRemoteAddress();

                print "Accepted new client: {$remoteAddr}" . PHP_EOL;

                $this->clients[$remoteAddr] = new Interpreter($socket, $this->debug);

                while (null !== $chunk = yield $socket->read()) {
                    $this->clients[$remoteAddr]->read($chunk);
                }

                unset($this->clients[$remoteAddr]);

                print "Client disconnected: {$remoteAddr}" . PHP_EOL;
            });
        }
    };

    $server->listen();
});
