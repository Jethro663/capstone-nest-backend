import { fireEvent, render, screen } from '@testing-library/react';
import { StudentJaWorkspaceHeader } from './StudentJaWorkspaceHeader';

describe('StudentJaWorkspaceHeader', () => {
  it('renders contextual class actions and forwards workspace controls', () => {
    const onOpenGuide = jest.fn();
    const onStartNewChat = jest.fn();
    const onEnableClassSelector = jest.fn();

    render(
      <StudentJaWorkspaceHeader
        classes={[]}
        selectedClassId="class-1"
        selectedClassLabel="Mathematics (MATH)"
        classSelectorOpen={false}
        classMenuOpen={false}
        aiUnavailable={false}
        mode="ask"
        busy={false}
        returnTo="/dashboard/student/classes/class-1"
        backLabel="Back to class"
        isContextualEntry
        onToggleClassMenu={jest.fn()}
        onSelectClass={jest.fn()}
        onOpenGuide={onOpenGuide}
        onStartNewChat={onStartNewChat}
        onEnableClassSelector={onEnableClassSelector}
      />,
    );

    expect(screen.getByText('Using this class')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to class' })).toHaveAttribute(
      'href',
      '/dashboard/student/classes/class-1',
    );

    fireEvent.click(screen.getByRole('button', { name: 'JA guide' }));
    fireEvent.click(screen.getByRole('button', { name: 'New chat' }));
    fireEvent.click(screen.getByRole('button', { name: 'Change class' }));

    expect(onOpenGuide).toHaveBeenCalledTimes(1);
    expect(onStartNewChat).toHaveBeenCalledTimes(1);
    expect(onEnableClassSelector).toHaveBeenCalledTimes(1);
  });
});
