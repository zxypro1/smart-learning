import classes from './AnimatedTitle.module.css';

export function AnimatedTitle({ text }: { text: string }) {
  return <h1 className={classes.title}>{text}</h1>;
}