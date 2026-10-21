@php($nonce = \Illuminate\Support\Facades\Vite::cspNonce())
@php($json = JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
<script type="application/json" data-sonner-config>{!! json_encode($options, $json) !!}</script>
<script type="application/json" data-sonner-toasts>{!! json_encode($toasts, $json) !!}</script>
@if ($withAssets)
<style data-sonner-styles @if ($nonce) nonce="{{ $nonce }}" @endif>{!! $styles() !!}</style>
<script data-sonner-runtime @if ($nonce) nonce="{{ $nonce }}" @endif>{!! $script() !!}</script>
@endif
