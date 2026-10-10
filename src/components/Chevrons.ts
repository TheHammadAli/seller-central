import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { isUrdu } from '../i18n';

// "Forward" and "back" chevrons that point the way the app reads: Urdu runs
// right to left, so there forward points left and back points right.
export const ChevronForward = isUrdu ? ChevronLeft : ChevronRight;
export const ChevronBack = isUrdu ? ChevronRight : ChevronLeft;
