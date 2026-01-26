/**
 * Verification Script for Todo Flow Visual Workbench
 * 
 * This script is intended to be run by the browser subagent
 * to provide a loggable "heartbeat" of functionality.
 */
async function runVerification() {
    console.log("--- STARTING VISUAL VERIFICATION ---");

    const findTask = (title) => {
        return Array.from(document.querySelectorAll('.todo-flow-task-card'))
            .find(el => el.textContent.includes(title));
    };

    // 1. Focus
    const task1 = findTask('Task 1');
    if (task1) {
        task1.click();
        console.log("SUCCESS: Task 1 focused");
    } else {
        throw new Error("Task 1 not found");
    }

    // 2. Create Task (c)
    window.prompt = () => "Scripted Task";
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));
    await new Promise(r => setTimeout(r, 100));

    if (findTask('Scripted Task')) {
        console.log("SUCCESS: Task created via 'c'");
    } else {
        throw new Error("Task creation failed");
    }

    // 3. Delete Task (Backspace)
    window.confirm = () => true;
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
    await new Promise(r => setTimeout(r, 100));

    if (!findTask('Scripted Task')) {
        console.log("SUCCESS: Task deleted via 'Backspace'");
    } else {
        throw new Error("Task deletion failed");
    }

    // 4. Undo (u)
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'u', bubbles: true }));
    await new Promise(r => setTimeout(r, 100));

    if (findTask('Scripted Task')) {
        console.log("SUCCESS: Undo restored the task");
    } else {
        throw new Error("Undo failed");
    }

    console.log("--- VERIFICATION COMPLETE: ALL GREEN ---");
}

runVerification().catch(err => {
    console.error("VERIFICATION FAILED:", err);
});
