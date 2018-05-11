<?php
declare(strict_types=1);

namespace Twifty\Server\Test;

use PHPUnit\Framework\TestCase;
use Twifty\Server\Interpreter;

/**
 * Test Case for the Interpreter class.
 */
class InterpreterTest extends TestCase
{
    /**
     * @var Interpreter
     */
    protected $interpreter;

    /**
     * This method is called before each test.
     */
    protected function setUp()
    {
        $this->interpreter = new Interpreter;
    }

    /**
     * This method is called after each test.
     */
    protected function tearDown()
    {
    }

    /**
     * @covers Twifty\Server\Interpreter::read
     */
    public function testRead()
    {
        $this->markTestIncomplete("This test has not yet been written.");
    }
}
