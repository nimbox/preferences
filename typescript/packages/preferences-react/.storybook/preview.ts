import type { Preview } from '@storybook/react-vite';

const preview: Preview = {
  decorators: [
    (Story) => {

      if (typeof document !== 'undefined') {

        document.documentElement.style.height = '100%';
        document.body.style.height = '100%';
        document.body.style.margin = '0';

        const root = document.getElementById('storybook-root');
        if (root) {
          root.style.height = '100%';
        }
      }

      return Story();

    }
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    }
  }
};

export default preview;
