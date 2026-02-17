<script>
  let { 
    size = 24, 
    color = 'currentColor',
    class: className = '',
    ...props 
  } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill={color}
  class="icon icon-user {className}"
  {...props}
>
  <path id="primary" d="M21,20a2,2,0,0,1-2,2H5a2,2,0,0,1-2-2,8,8,0,0,1,1.79-5,2,2,0,0,1,2.67-.39,8.07,8.07,0,0,0,9.07,0,2,2,0,0,1,2.68.39A8,8,0,0,1,21,20Zm-9-6A6,6,0,1,0,6,8,6,6,0,0,0,12,14Z" style="fill: rgb(0, 0, 0);"></path>
</svg>
