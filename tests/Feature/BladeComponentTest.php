<?php

use AmjadIqbal\Sonner\SonnerManager;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Vite;

function jsonScript(string $html, string $attribute): mixed
{
    preg_match('/<script type="application\/json" '.$attribute.'>(.*?)<\/script>/s', $html, $m);

    expect($m)->not->toBeEmpty();

    return json_decode($m[1], true);
}

it('prints Sonner 2.0.8 styles, the overrides and the runtime once', function () {
    $html = Blade::render('<x-sonner /><x-sonner />');

    expect(substr_count($html, 'data-sonner-runtime'))->toBe(1)
        ->and(substr_count($html, '<style data-sonner-styles'))->toBe(1)
        ->and($html)
        ->toContain('Sonner 2.0.8 styles.css')
        ->toContain("[data-sonner-toast][data-mounted='true']")
        ->toContain('--error-bg: hsl(0, 0%, 7%)')
        ->toContain('window.LaravelSonner = {')
        ->not->toContain('ai-sonner-toast')
        ->not->toContain('react-dom');
});

it('passes config defaults to the toaster, overridden by attributes', function () {
    config()->set('sonner.toaster.position', 'top-right');
    config()->set('sonner.toaster.duration', 3000);

    $options = jsonScript(Blade::render('<x-sonner position="top-center" rich-colors close-button :visible-toasts="5" />'), 'data-sonner-config');

    expect($options)->toMatchArray([
        'position' => 'top-center',
        'duration' => 3000,
        'richColors' => true,
        'closeButton' => true,
        'visibleToasts' => 5,
        'theme' => 'light',
        'hotkey' => ['altKey', 'KeyT'],
        'global' => true,
    ]);
});

it('renders flashed toasts and removes them from the session', function () {
    toast()->success('Saved')->description('All good.');

    $toasts = jsonScript(Blade::render('<x-sonner />'), 'data-sonner-toasts');

    expect($toasts)->toHaveCount(1)
        ->and($toasts[0])->toMatchArray(['type' => 'success', 'title' => 'Saved', 'description' => 'All good.'])
        ->and(app(SonnerManager::class)->pending())->toBe([]);
});

it('cannot be broken out of with a closing script tag', function () {
    toast('</script><script>alert(1)</script>');

    $html = Blade::render('<x-sonner />');

    expect($html)->not->toContain('<script>alert(1)')
        ->and(jsonScript($html, 'data-sonner-toasts')[0]['title'])->toBe('</script><script>alert(1)</script>');
});

it('adds the Vite CSP nonce to the style and script tags', function () {
    Vite::useCspNonce('abc123');

    $html = Blade::render('<x-sonner />');

    expect($html)->toMatch('/<style data-sonner-styles\s+nonce="abc123"/')
        ->toMatch('/<script data-sonner-runtime\s+nonce="abc123"/');
});

it('shows the toasts on the page after a redirect, once', function () {
    Route::middleware('web')->post('/save', function () {
        toast()->success('Saved');

        return redirect('/page');
    });
    Route::middleware('web')->get('/page', fn () => Blade::render('<html><body>Page <x-sonner /></body></html>'));

    $this->post('/save')->assertRedirect('/page');

    $this->get('/page')->assertSee('"title":"Saved"', false);
    $this->get('/page')->assertDontSee('"title":"Saved"', false);
});

it('adds a passive line to php artisan about', function () {
    Artisan::call('about');

    expect(Artisan::output())
        ->toContain('Sonner toasts')
        ->toContain('amjad.com.pk/contact');
});
