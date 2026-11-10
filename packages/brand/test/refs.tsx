import { useRef } from 'react';
import {
  ActionButton,
  Button,
  Checkbox,
  Dialog,
  IconButton,
  Input,
  Select,
  Table,
  Textarea,
} from '../src/index';

// Compiled by `tsc --noEmit` (tsconfig include). Not executed: there is no DOM
// in this package's test runner, so a callback ref cannot be observed.
export function RefPropsCompile() {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const select = useRef<HTMLSelectElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const checkbox = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const link = useRef<HTMLAnchorElement>(null);
  const icon = useRef<HTMLButtonElement>(null);
  const action = useRef<HTMLButtonElement>(null);
  const table = useRef<HTMLTableElement>(null);
  const thead = useRef<HTMLTableSectionElement>(null);
  const row = useRef<HTMLTableRowElement>(null);

  return (
    <>
      <Dialog ref={dialog} id="d" title="Title" />
      <Input ref={input} />
      <Select ref={select} />
      <Textarea ref={textarea} />
      <Checkbox ref={checkbox} />
      <Button ref={button}>Go</Button>
      <Button ref={link} href="/local">
        Link
      </Button>
      <IconButton ref={icon} label="Close">
        ×
      </IconButton>
      <ActionButton ref={action}>Save</ActionButton>
      <Table ref={table}>
        <Table.Head ref={thead}>
          <Table.Row ref={row}>
            <Table.HeaderCell>Col</Table.HeaderCell>
          </Table.Row>
        </Table.Head>
      </Table>
    </>
  );
}
