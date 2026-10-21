<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Toaster defaults
    |--------------------------------------------------------------------------
    |
    | Applied to every <x-sonner /> and overridden by its attributes, e.g.
    | <x-sonner position="top-center" rich-colors />. Each key is a Sonner
    | <Toaster /> prop in snake_case: https://sonner.emilkowal.ski/toaster
    |
    | offset / mobile_offset: a number of pixels, a CSS length ("2rem"), or
    | ['top' => ..., 'right' => ..., 'bottom' => ..., 'left' => ...].
    |
    */

    'toaster' => [
        'position' => 'bottom-right',
        'theme' => 'light',
        'rich_colors' => false,
        'expand' => false,
        'close_button' => false,
        'duration' => 4000,
        'visible_toasts' => 3,
        'gap' => 14,
        'offset' => null,
        'mobile_offset' => null,
        'dir' => 'auto',
        'invert' => false,
        'hotkey' => ['altKey', 'KeyT'],
        'container_aria_label' => 'Notifications',
        'close_button_aria_label' => 'Close toast',
    ],

    /*
    |--------------------------------------------------------------------------
    | window.toast
    |--------------------------------------------------------------------------
    |
    | The runtime always defines window.Sonner. It also defines window.toast,
    | unless something else on the page already did or this is false.
    |
    */

    'global' => true,

    /*
    |--------------------------------------------------------------------------
    | Livewire
    |--------------------------------------------------------------------------
    |
    | When true and Livewire is installed, toast() calls made during a
    | Livewire update are sent to the browser in that same response. If the
    | component redirects, they wait in the session for the next page.
    |
    */

    'livewire' => true,

];
