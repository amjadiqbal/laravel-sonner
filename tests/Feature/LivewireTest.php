<?php

use AmjadIqbal\Sonner\SonnerManager;
use Livewire\Component;
use Livewire\Livewire;

class SaveProfile extends Component
{
    public function save(): void
    {
        toast()->success('Profile saved')->description('Your changes are live.');
    }

    public function saveAndLeave(): void
    {
        toast()->success('Saved, see you');

        $this->redirect('/dashboard');
    }

    public function render(): string
    {
        return '<div><button wire:click="save">Save</button></div>';
    }
}

it('sends toasts from a Livewire action back in the same response', function () {
    Livewire::test(SaveProfile::class)
        ->call('save')
        ->assertDispatched('sonner:toast', fn ($name, $params) => $params['toasts'][0]['title'] === 'Profile saved'
            && $params['toasts'][0]['type'] === 'success'
            && $params['toasts'][0]['description'] === 'Your changes are live.');

    expect(app(SonnerManager::class)->pending())->toBe([]);
});

it('keeps toasts for the next page when the action redirects', function () {
    Livewire::test(SaveProfile::class)
        ->call('saveAndLeave')
        ->assertRedirect('/dashboard')
        ->assertNotDispatched('sonner:toast');

    expect(app(SonnerManager::class)->pending()[0]['title'])->toBe('Saved, see you');
});

it('can be switched off', function () {
    config()->set('sonner.livewire', false);

    Livewire::test(SaveProfile::class)->call('save')->assertNotDispatched('sonner:toast');
});
