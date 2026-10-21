<?php

namespace AmjadIqbal\Sonner;

use AmjadIqbal\Sonner\View\Components\Sonner;
use Composer\InstalledVersions;
use Illuminate\Foundation\Console\AboutCommand;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;

class SonnerServiceProvider extends ServiceProvider
{
    public const SUPPORT_URL = 'https://amjad.com.pk/contact?utm_source=artisan&utm_medium=about&utm_campaign=laravel-sonner';

    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/sonner.php', 'sonner');

        $this->app->scoped(SonnerManager::class);
        $this->app->alias(SonnerManager::class, 'sonner');
    }

    public function boot(): void
    {
        $this->loadViewsFrom(__DIR__.'/../resources/views', 'sonner');

        Blade::component('sonner', Sonner::class);

        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__.'/../config/sonner.php' => config_path('sonner.php'),
            ], 'sonner-config');

            $this->publishes([
                __DIR__.'/../resources/views' => resource_path('views/vendor/sonner'),
            ], 'sonner-views');
        }

        $this->registerLivewireHook();

        AboutCommand::add('Sonner toasts', fn () => [
            'Version' => InstalledVersions::isInstalled('amjadiqbal/laravel-sonner')
                ? (string) InstalledVersions::getPrettyVersion('amjadiqbal/laravel-sonner')
                : 'unknown',
            'Sonner' => '2.0.8 (bundled, no React)',
            'Support' => self::SUPPORT_URL,
        ]);
    }

    /**
     * During a Livewire update, hand the toasts flashed so far to the browser as a "sonner:toast" dispatch on
     * the same response. Livewire would otherwise drop the flash data of a request that does not redirect. If
     * the component redirects, the toasts stay in the session for the next page.
     */
    protected function registerLivewireHook(): void
    {
        if (! function_exists('Livewire\after') || ! function_exists('Livewire\store')) {
            return;
        }

        \Livewire\after('dehydrate', function ($component, $context) {
            if (! config('sonner.livewire', true) || $context->isMounting()) {
                return;
            }

            if (\Livewire\store($component)->get('redirect')) {
                return;
            }

            $toasts = app(SonnerManager::class)->pull();

            if ($toasts !== []) {
                $context->pushEffect('dispatches', ['name' => 'sonner:toast', 'params' => ['toasts' => $toasts]]);
            }
        });
    }
}
