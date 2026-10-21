<?php

namespace AmjadIqbal\Sonner;

use Illuminate\Support\Str;

/**
 * Keeps toasts in the session until the next page with <x-sonner /> shows them.
 */
class SonnerManager
{
    public const SESSION_KEY = 'laravel_sonner_toasts';

    protected bool $assetsPrinted = false;

    public function toast(?string $message = null): Toast
    {
        $toast = new Toast($this, (string) Str::uuid());

        return $message === null ? $toast : $toast->message($message);
    }

    public function message(string $title): Toast
    {
        return $this->toast()->message($title);
    }

    public function success(string $title): Toast
    {
        return $this->toast()->success($title);
    }

    public function info(string $title): Toast
    {
        return $this->toast()->info($title);
    }

    public function warning(string $title): Toast
    {
        return $this->toast()->warning($title);
    }

    public function error(string $title): Toast
    {
        return $this->toast()->error($title);
    }

    public function loading(string $title): Toast
    {
        return $this->toast()->loading($title);
    }

    /**
     * Adds a toast, or replaces the one with the same id.
     *
     * @param  array<string, mixed>  $toast
     */
    public function put(array $toast): void
    {
        $toasts = $this->pending();
        $index = array_search($toast['id'], array_column($toasts, 'id'), true);

        if ($index === false) {
            $toasts[] = $toast;
        } else {
            $toasts[$index] = $toast;
        }

        session()->flash(self::SESSION_KEY, $toasts);
    }

    public function forget(string $id): void
    {
        $toasts = array_values(array_filter($this->pending(), fn (array $toast) => $toast['id'] !== $id));

        session()->flash(self::SESSION_KEY, $toasts);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function pending(): array
    {
        if (! app()->bound('session.store')) {
            return [];
        }

        return array_values((array) session()->get(self::SESSION_KEY, []));
    }

    /**
     * Returns the pending toasts and removes them from the session.
     *
     * @return array<int, array<string, mixed>>
     */
    public function pull(): array
    {
        $toasts = $this->pending();

        if ($toasts !== []) {
            session()->forget(self::SESSION_KEY);
        }

        return $toasts;
    }

    public function clear(): void
    {
        $this->pull();
    }

    /**
     * True only the first time it is called in a request, so the CSS and runtime print once per page.
     */
    public function claimAssets(): bool
    {
        if ($this->assetsPrinted) {
            return false;
        }

        return $this->assetsPrinted = true;
    }

    public function styles(): string
    {
        return file_get_contents(__DIR__.'/../resources/css/sonner.css')."\n"
            .file_get_contents(__DIR__.'/../resources/css/overrides.css');
    }

    public function script(): string
    {
        return (string) file_get_contents(__DIR__.'/../resources/js/sonner.js');
    }
}
