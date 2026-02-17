<script>
  import Conditioner from './icons/Conditioner.svelte';

  const iconMap = {
    'conditioner': Conditioner
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
