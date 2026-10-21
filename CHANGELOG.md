# Changelog

All notable changes to `amjadiqbal/laravel-sonner` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-10-21

First release. The code on `dev-main` before it drew its own toasts and only borrowed Sonner's name: no
stacking, no animations, no Sonner styles. It could not be installed on Laravel 12 or 13, and a toast
message containing `</script>` could inject HTML into the page.

### Added

- Sonner 2.0.8 toasts without React: Sonner's `styles.css` bundled unchanged, plus a plain-JavaScript port
  of its Toaster logic (stacking, hover to expand, swipe to dismiss, timers that pause on hover and in
  hidden tabs, `Alt+T` hotkey, light/dark/system themes, rich colors, six positions, RTL).
- `toast()` helper and `Sonner` facade: `success()`, `info()`, `warning()`, `error()`, `loading()`,
  `message()`, `description()`, `duration()`, `persistent()`, `position()`, `action()`, `cancel()`,
  `closeButton()`, `richColors()`, `invert()`, `dismissible()`, `className()`, `id()`.
- `<x-sonner />` with every `<Toaster />` prop, defaults in `config/sonner.php`.
- Browser API matching Sonner: `toast()`, `toast.success()`, `toast.error()`, `toast.warning()`,
  `toast.info()`, `toast.loading()`, `toast.promise()`, `toast.dismiss()`, `toast.getToasts()`.
- Livewire 3/4: toasts from an action arrive in the same response; on a redirect they wait for the next
  page. Open toasts survive `wire:navigate`.
- `sonner:toast` browser event for Alpine and Livewire dispatches.
- Laravel's CSP nonce on the inline style and script; a line in `php artisan about`.
- Laravel 12 and 13 support (PHP 8.3+).

### Changed

- In the dark theme with rich colors, error and warning toasts use a neutral background instead of
  Sonner's very dark red and olive.

### Removed

- `AmjadIqbal\Sonner\Livewire\UsesSonner` (not needed any more) and the PHP `promise()` method (use
  `toast.promise()` in JavaScript).

### Fixed

- The toast queue is printed as JSON with `<`, `>`, `&` and quotes escaped, and toast text is set with
  `textContent`, so toast messages can no longer inject HTML.
- Flashed toasts show once, then leave the session (they could stay forever if a page never rendered them).

[1.0.0]: https://github.com/amjadiqbal/laravel-sonner/releases/tag/v1.0.0
