<?php

namespace AmjadIqbal\Sonner;

use Illuminate\Contracts\Support\Arrayable;
use JsonSerializable;

/**
 * One toast, built fluently. Every call saves it, so toast()->success('Saved') is enough on its own.
 *
 * @implements Arrayable<string, mixed>
 */
class Toast implements Arrayable, JsonSerializable
{
    public const POSITIONS = ['top-left', 'top-right', 'top-center', 'bottom-left', 'bottom-right', 'bottom-center'];

    /** @var array<string, mixed> */
    protected array $data;

    public function __construct(protected SonnerManager $manager, string $id)
    {
        $this->data = ['id' => $id, 'type' => 'default', 'title' => ''];
    }

    public function message(string $title): static
    {
        return $this->as('default', $title);
    }

    public function success(string $title): static
    {
        return $this->as('success', $title);
    }

    public function info(string $title): static
    {
        return $this->as('info', $title);
    }

    public function warning(string $title): static
    {
        return $this->as('warning', $title);
    }

    public function error(string $title): static
    {
        return $this->as('error', $title);
    }

    /** A spinner toast. It has no timer, so replace it later with ->id() or dismiss it from JavaScript. */
    public function loading(string $title): static
    {
        return $this->as('loading', $title);
    }

    public function description(?string $description): static
    {
        return $this->set('description', $description);
    }

    /** Milliseconds the toast stays open. */
    public function duration(int $milliseconds): static
    {
        return $this->set('duration', $milliseconds);
    }

    /** Stays open until the user closes it. */
    public function persistent(bool $persistent = true): static
    {
        return $this->set('persistent', $persistent ?: null);
    }

    public function position(string $position): static
    {
        if (! in_array($position, self::POSITIONS, true)) {
            throw new \InvalidArgumentException("Unknown toast position [{$position}]. Use one of: ".implode(', ', self::POSITIONS).'.');
        }

        return $this->set('position', $position);
    }

    public function closeButton(bool $show = true): static
    {
        return $this->set('closeButton', $show);
    }

    public function richColors(bool $rich = true): static
    {
        return $this->set('richColors', $rich);
    }

    public function invert(bool $invert = true): static
    {
        return $this->set('invert', $invert);
    }

    /** False stops the user from swiping or closing it. */
    public function dismissible(bool $dismissible = true): static
    {
        return $this->set('dismissible', $dismissible);
    }

    /** A button that closes the toast and, given a URL, goes there. */
    public function action(string $label, ?string $url = null): static
    {
        return $this->set('action', array_filter(['label' => $label, 'url' => $url], fn ($v) => $v !== null));
    }

    /** A secondary button that just closes the toast. */
    public function cancel(string $label = 'Cancel'): static
    {
        return $this->set('cancel', ['label' => $label]);
    }

    public function className(string $class): static
    {
        return $this->set('className', $class);
    }

    /** Toasts with the same id replace each other, here and in the browser (e.g. a "loading" toast). */
    public function id(string $id): static
    {
        $previous = $this->data['id'];
        $this->data['id'] = $id;

        if ($previous !== $id) {
            $this->manager->forget($previous);
        }

        return $this->save();
    }

    public function getId(): string
    {
        return $this->data['id'];
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return $this->data;
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return $this->toArray();
    }

    protected function as(string $type, string $title): static
    {
        $this->data['type'] = $type;
        $this->data['title'] = $title;

        return $this->save();
    }

    protected function set(string $key, mixed $value): static
    {
        if ($value === null) {
            unset($this->data[$key]);
        } else {
            $this->data[$key] = $value;
        }

        return $this->save();
    }

    protected function save(): static
    {
        $this->manager->put($this->data);

        return $this;
    }
}
