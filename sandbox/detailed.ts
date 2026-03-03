import { mount } from 'svelte';
import DetailedTaskView from './prototypes/DetailedTaskView.svelte';
import moment from 'moment';

const appTarget = document.getElementById('app');
if (appTarget) {
    const detailContainer = document.createElement('div');
    detailContainer.className = 'mobile-jail';
    detailContainer.style.position = 'relative';
    detailContainer.style.height = '400px';
    detailContainer.style.border = '1px dashed #444';
    detailContainer.style.borderRadius = '12px';
    detailContainer.style.overflow = 'hidden';
    appTarget.appendChild(detailContainer);

    mount(DetailedTaskView, {
        target: detailContainer,
        props: {
            title: 'Detailed View: Keyboard Resilience Test',
            startTime: moment().add(2, 'hours'),
            duration: 45,
            status: 'todo',
            isAnchored: false,
            onClose: () => console.log('Closed')
        }
    });
}
