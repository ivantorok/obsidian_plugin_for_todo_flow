<script lang="ts">
    import TaskContextMenu from '../../src/views/TaskContextMenu.svelte';
    import HighDensityLeanCard from './HighDensityLeanCard.svelte';
    import { moment } from 'obsidian';

    let showMenuIndex = $state(-1);
    let taskElements: HTMLElement[] = $state([]);

    const prototypes = [
        { title: 'Morning Routine & Coffee', startTime: moment(), duration: 30, status: 'done', isAnchored: true },
        { title: 'Write Weekly Update', startTime: moment().add(30, 'minutes'), duration: 45, status: 'todo', isAnchored: false },
        { title: 'Project X Sync', startTime: moment().add(75, 'minutes'), duration: 60, status: 'todo', isAnchored: true },
        { title: 'Clear Inbox', startTime: moment().add(135, 'minutes'), duration: 15, status: 'todo', isAnchored: false }
    ];

    function toggleMenu(index: number) {
        if (showMenuIndex === index) {
            showMenuIndex = -1;
        } else {
            showMenuIndex = index;
        }
    }

    function closeMenu() {
        showMenuIndex = -1;
    }
</script>

<div class="todo-flow-stack-container is-mobile demo-container">
    <div class="todo-flow-timeline">
        {#each prototypes as p, i}
             <div class="card-relative-wrapper">
                 <!-- svelte-ignore a11y_click_events_have_key_events -->
                 <!-- svelte-ignore a11y_no_static_element_interactions -->
                 <div class="card-click-wrapper" bind:this={taskElements[i]} onclick={() => toggleMenu(i)} class:menu-open={showMenuIndex === i}>
                     <HighDensityLeanCard 
                        title={p.title}
                        startTime={p.startTime}
                        duration={p.duration}
                        status={p.status as any}
                        isAnchored={p.isAnchored}
                        focused={showMenuIndex === i}
                     />
                 </div>
                 
                 {#if showMenuIndex === i}
                    <TaskContextMenu 
                        isAnchored={p.isAnchored}
                        targetElement={taskElements[i]}
                        onOpenDetails={() => console.log('Open Details', i)}
                        onToggleReorder={() => console.log('Toggle Reorder', i)}
                        onToggleAnchor={() => { p.isAnchored = !p.isAnchored; closeMenu(); }}
                        onScaleDuration={(dir) => console.log('Scale Duration', dir, i)}
                        onClose={closeMenu}
                    />
                 {/if}
             </div>
        {/each}
    </div>
</div>

{#if showMenuIndex !== -1}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="overlay active" onclick={closeMenu}></div>
{/if}

<style>
    .demo-container {
        height: 100%;
        width: 100%;
        padding: 16px; 
        padding-top: 80px; 
        box-sizing: border-box;
    }
    .card-relative-wrapper {
        position: relative;
        width: 100%;
        z-index: 1;
    }
    .card-click-wrapper {
        cursor: pointer;
        width: 100%;
        transition: transform 0.2s ease, filter 0.2s ease;
    }
    .card-click-wrapper.menu-open {
        transform: scale(0.98);
        z-index: 100;
        position: relative;
    }
    .overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 50;
    }
</style>
