<?php

namespace AmjadIqbal\Sonner\Facades;

use AmjadIqbal\Sonner\SonnerManager;
use AmjadIqbal\Sonner\Toast;
use Illuminate\Support\Facades\Facade;

/**
 * @method static Toast toast(?string $message = null)
 * @method static Toast message(string $title)
 * @method static Toast success(string $title)
 * @method static Toast info(string $title)
 * @method static Toast warning(string $title)
 * @method static Toast error(string $title)
 * @method static Toast loading(string $title)
 * @method static array<int, array<string, mixed>> pending()
 * @method static array<int, array<string, mixed>> pull()
 * @method static void forget(string $id)
 * @method static void clear()
 *
 * @see SonnerManager
 */
class Sonner extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return SonnerManager::class;
    }
}
