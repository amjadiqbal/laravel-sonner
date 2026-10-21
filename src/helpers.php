<?php

use AmjadIqbal\Sonner\SonnerManager;
use AmjadIqbal\Sonner\Toast;

if (! function_exists('toast')) {
    /**
     * toast('Saved') flashes a toast; toast() alone returns a builder: toast()->success('Saved')->description('...').
     */
    function toast(?string $message = null): Toast
    {
        return app(SonnerManager::class)->toast($message);
    }
}
