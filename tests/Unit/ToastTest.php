<?php

use AmjadIqbal\Sonner\Facades\Sonner;
use AmjadIqbal\Sonner\SonnerManager;

function pendingToasts(): array
{
    return app(SonnerManager::class)->pending();
}

it('flashes a default toast from toast($message)', function () {
    toast('Profile updated');

    expect(pendingToasts())->toHaveCount(1)
        ->and(pendingToasts()[0])->toMatchArray(['type' => 'default', 'title' => 'Profile updated'])
        ->and(session()->get('_flash.new'))->toContain(SonnerManager::SESSION_KEY);
});

it('keeps one entry per toast while the builder chain updates it', function () {
    toast()->success('Order shipped')
        ->description('Order #123 is on its way.')
        ->duration(6000)
        ->position('top-center')
        ->richColors()
        ->closeButton()
        ->action('Track', 'https://example.test/orders/123')
        ->cancel('Later');

    expect(pendingToasts())->toHaveCount(1)
        ->and(pendingToasts()[0])->toMatchArray([
            'type' => 'success',
            'title' => 'Order shipped',
            'description' => 'Order #123 is on its way.',
            'duration' => 6000,
            'position' => 'top-center',
            'richColors' => true,
            'closeButton' => true,
            'action' => ['label' => 'Track', 'url' => 'https://example.test/orders/123'],
            'cancel' => ['label' => 'Later'],
        ]);
});

it('stores separate toasts separately', function () {
    toast()->error('Payment failed');
    toast()->warning('Card expires soon');
    Sonner::info('Heads up');

    expect(array_column(pendingToasts(), 'type'))->toBe(['error', 'warning', 'info']);
});

it('replaces a toast that reuses an id', function () {
    toast()->loading('Importing...')->id('import');
    toast()->success('Import finished')->id('import');

    expect(pendingToasts())->toHaveCount(1)
        ->and(pendingToasts()[0])->toMatchArray(['id' => 'import', 'type' => 'success', 'title' => 'Import finished']);
});

it('marks persistent toasts and can unset options again', function () {
    $toast = toast()->info('Read me')->persistent()->description('x');
    $toast->description(null)->persistent(false);

    expect(pendingToasts()[0])->not->toHaveKey('description')->not->toHaveKey('persistent');

    toast()->info('Stay')->persistent();

    expect(pendingToasts()[1]['persistent'])->toBeTrue();
});

it('rejects positions Sonner does not have', function () {
    toast()->success('x')->position('middle');
})->throws(InvalidArgumentException::class);

it('does not flash anything until a toast gets a type or title', function () {
    toast();

    expect(pendingToasts())->toBe([]);
});

it('pull() empties the queue', function () {
    toast('One');

    expect(app(SonnerManager::class)->pull())->toHaveCount(1)
        ->and(pendingToasts())->toBe([]);
});
