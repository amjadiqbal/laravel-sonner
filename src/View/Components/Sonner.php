<?php

namespace AmjadIqbal\Sonner\View\Components;

use AmjadIqbal\Sonner\SonnerManager;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Str;
use Illuminate\View\Component;

/**
 * <x-sonner />: Sonner's <Toaster />. Put it once in your layout, just before </body>.
 */
class Sonner extends Component
{
    /** @var array<string, mixed> */
    public array $options;

    /** @var array<int, array<string, mixed>> */
    public array $toasts;

    public bool $withAssets;

    /**
     * @param  int|string|array<string, int|string>|null  $offset
     * @param  int|string|array<string, int|string>|null  $mobileOffset
     * @param  array<int, string>|null  $hotkey
     * @param  array<int, string>|null  $swipeDirections
     */
    public function __construct(
        ?string $position = null,
        ?string $theme = null,
        ?bool $richColors = null,
        ?bool $expand = null,
        ?bool $closeButton = null,
        ?int $duration = null,
        ?int $visibleToasts = null,
        ?int $gap = null,
        int|string|array|null $offset = null,
        int|string|array|null $mobileOffset = null,
        ?string $dir = null,
        ?bool $invert = null,
        ?array $hotkey = null,
        ?array $swipeDirections = null,
        ?string $toastClass = null,
    ) {
        $options = [];

        foreach ((array) config('sonner.toaster', []) as $key => $value) {
            $options[Str::camel((string) $key)] = $value;
        }

        $props = compact(
            'position', 'theme', 'richColors', 'expand', 'closeButton', 'duration', 'visibleToasts',
            'gap', 'offset', 'mobileOffset', 'dir', 'invert', 'hotkey', 'swipeDirections',
        );

        foreach ($props as $key => $value) {
            if ($value !== null) {
                $options[$key] = $value;
            }
        }

        if ($toastClass !== null) {
            $options['toastClassName'] = $toastClass;
        }

        $options['global'] = (bool) config('sonner.global', true);

        $manager = app(SonnerManager::class);

        $this->options = $options;
        $this->toasts = $manager->pull();
        $this->withAssets = $manager->claimAssets();
    }

    public function styles(): string
    {
        return app(SonnerManager::class)->styles();
    }

    public function script(): string
    {
        return app(SonnerManager::class)->script();
    }

    public function render(): View
    {
        return view('sonner::components.sonner');
    }
}
