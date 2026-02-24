<script>
  import ArrowLeftRight from './icons/ArrowLeftRight.svelte';
  import BarChart3 from './icons/BarChart3.svelte';
  import Bath from './icons/Bath.svelte';
  import Bed from './icons/Bed.svelte';
  import Building from './icons/Building.svelte';
  import CreditCard from './icons/CreditCard.svelte';
  import DoorOpen from './icons/DoorOpen.svelte';
  import Heart from './icons/Heart.svelte';
  import HelpCircle from './icons/HelpCircle.svelte';
  import Home from './icons/Home.svelte';
  import LayoutGrid from './icons/LayoutGrid.svelte';
  import List from './icons/List.svelte';
  import LogOut from './icons/LogOut.svelte';
  import Map from './icons/Map.svelte';
  import Maximize from './icons/Maximize.svelte';
  import Plus from './icons/Plus.svelte';
  import Share2 from './icons/Share2.svelte';
  import ShieldCheck from './icons/ShieldCheck.svelte';
  import Shield from './icons/Shield.svelte';
  import User from './icons/User.svelte';
  import Users from './icons/Users.svelte';

  const iconMap = {
    'arrow-left-right': ArrowLeftRight,
    'bar-chart-3': BarChart3,
    'bath': Bath,
    'bed': Bed,
    'building': Building,
    'credit-card': CreditCard,
    'door-open': DoorOpen,
    'heart': Heart,
    'help-circle': HelpCircle,
    'home': Home,
    'layout-grid': LayoutGrid,
    'list': List,
    'log-out': LogOut,
    'map': Map,
    'maximize': Maximize,
    'plus': Plus,
    'share-2': Share2,
    'shield-check': ShieldCheck,
    'shield': Shield,
    'user': User,
    'users': Users
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
