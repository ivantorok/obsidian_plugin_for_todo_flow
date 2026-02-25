import moment from 'moment';
import { DateParser } from '../src/utils/DateParser';

const testInputs = [
    'Task B Edited',
    'Task at noon',
    'Task at 12:45',
    'Task B',
    '12:45 Task'
];

console.log('--- NLP Truncation Repro ---');
testInputs.forEach(input => {
    const parsed = DateParser.parseTaskInput(input, moment('2026-02-25 09:00'));
    console.log(`Input: "${input}" -> Title: "${parsed.title}" (Anchored: ${parsed.isAnchored})`);
});
