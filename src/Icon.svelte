<script>
  import BarChart3 from './icons/BarChart3.svelte';
  import Heart from './icons/Heart.svelte';
  import Home from './icons/Home.svelte';
  import LayoutGrid from './icons/LayoutGrid.svelte';
  import List from './icons/List.svelte';
  import LogOut from './icons/LogOut.svelte';
  import Map from './icons/Map.svelte';
  import Pet from './icons/Pet.svelte';
  import Plus from './icons/Plus.svelte';
  import Share2 from './icons/Share2.svelte';
  import Shield from './icons/Shield.svelte';
  import User from './icons/User.svelte';

  const iconMap = {
    'bar-chart-3': BarChart3,
    'heart': Heart,
    'home': Home,
    'layout-grid': LayoutGrid,
    'list': List,
    'log-out': LogOut,
    'map': Map,
    'pet': Pet,
    'plus': Plus,
    'share-2': Share2,
    'shield': Shield,
    'user': User
  };

  let {
    name,
    size = 24,
    color = 'currentColor',
    strokeWidth = 1.5,
    title = '',
    class: className = '',
    ...rest
  } = $props();

  let IconComponent = $derived(iconMap[name]);
</script>

{#if IconComponent}
  <IconComponent {size} {color} {strokeWidth} {title} class={className} {...rest} />
{:else}
  <span style="display:inline-flex;align-items:center;gap:4px;color:#ef4444;font-size:12px;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
    {name}
  </span>
{/if}
