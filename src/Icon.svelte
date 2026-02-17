<script>
  import BarChart3 from './icons/BarChart3.svelte';
  import Conditioner from './icons/Conditioner.svelte';
  import Heart from './icons/Heart.svelte';
  import Home from './icons/Home.svelte';
  import LayoutGrid from './icons/LayoutGrid.svelte';
  import List from './icons/List.svelte';
  import LogOut from './icons/LogOut.svelte';
  import Map from './icons/Map.svelte';
  import Plus from './icons/Plus.svelte';
  import Shield from './icons/Shield.svelte';
  import User from './icons/User.svelte';

  const iconMap = {
    'bar-chart-3': BarChart3,
    'conditioner': Conditioner,
    'heart': Heart,
    'home': Home,
    'layout-grid': LayoutGrid,
    'list': List,
    'log-out': LogOut,
    'map': Map,
    'plus': Plus,
    'shield': Shield,
    'user': User
  };

  let { 
    name,
    size = 24, 
    color = 'currentColor',
    class: className = '',
    ...props 
  } = $props();

  let IconComponent = $derived(iconMap[name]);
</script>

{#if IconComponent}
  <IconComponent {size} {color} class={className} {...props} />
{:else}
  <span style="color: red;">Icon "{name}" not found</span>
{/if}
