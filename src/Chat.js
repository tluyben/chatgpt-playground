import React from 'react';
import { useState, useRef } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
import Divider from '@material-ui/core/Divider';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Avatar from '@material-ui/core/Avatar';
import Fab from '@material-ui/core/Fab';
import SendIcon from '@material-ui/icons/Send';
import ReactMarkdown from 'react-markdown'
import CircularProgress from '@material-ui/core/CircularProgress';
import tablemark from "tablemark"
import remarkGfm from 'remark-gfm'

const useStyles = makeStyles({
    table: {
        minWidth: 650,
    },
    chatSection: {
        width: '100%',
        height: '100vh'
    },
    headBG: {
        backgroundColor: '#e0e0e0'
    },
    borderRight500: {
        borderRight: '1px solid #e0e0e0'
    },
    messageArea: {
        height: '87vh',
        overflowY: 'auto'
    }
});

const Chat = () => {
    const classes = useStyles();
    const [message, setMessage] = useState('');
    const chatWindowRef = useRef(null);
    //let message = '';
    const [chat, setChat] = useState([
    ])
    const [isLoading, setIsLoading] = useState(false);

    function handleChange(event) {
        setMessage(event.target.value);
    }
    function keyPress(e) {
        if (e.keyCode == 13) {
            addMessage('ME', message);
        }
    }

    async function handleCommand(command) {
        const _cmd = command.split(' ');
        const base = _cmd[0].substring(1);
        const cmd = _cmd[1]
        const time = new Date().toLocaleTimeString().slice(0, 5)
        try {
            setIsLoading(true);
            const response = await fetch(`/api/${base}/${cmd}`);
            const cmdData1 = await response.json();
            setIsLoading(false);

            // add the response from the server to the chat
            //setChat([...chat, { from, msg, time }, { from: 'AI', msg: data.join('\n'), time }])
            if (cmdData1.prompt) {
                setIsLoading(true);
                let formattedData
                if (cmdData1.data) {
                    formattedData = JSON.stringify(cmdData1.data)
                } else {
                    // data is the rest of our command after base/cmd
                    formattedData = _cmd.slice(2).join(' ')
                }
                const response = await fetch('/api/send?message= ' + encodeURIComponent(cmdData1.prompt + '\n\n' + formattedData));
                const gptData = await response.json();
                if (cmdData1.type === 'code' && cmdData1.var) {
                    // we need to parse the code from the markdown in _data.join('\n')
                    const code = gptData.join('\n').match(/```(.*)```/s)[0].replace(/```css/g, '').replace(/```sql/g, '').replace(/```/g, '')
                    if (!code) {
                        setChat([...chat, { from: 'ME', msg: command, time }, { from: 'AI', msg: gptData.join('\n'), time }])

                    } else {
                        // and another trip to to send the code; 
                        const response = await fetch(`/api/${base}/${cmd}?${cmdData1.var}=${encodeURIComponent(code)}`);
                        const cmdData2 = await response.json();

                        if (cmdData2?.error) {
                            setChat([...chat, { from: 'ME', msg: command, time }, { from: 'AI', msg: cmdData2.error, time }])

                        } else {

                            setChat([...chat, { from: 'ME', msg: command, time }, { from: 'AI', msg: `Found ${cmdData2.length} results\n\n` + tablemark(cmdData2), time }])


                        }
                        console.log(cmdData2)
                    }
                }
                setIsLoading(false);
            } else {
                // ? 
            }
        } catch (error) {
            // add the error to the chat as AI 
            setIsLoading(false);

            setChat([...chat, { from: 'ME', msg: command, time }, { from: 'AI', msg: 'I do not recognize this command', time }])

            console.error(error);
        }
        chatWindowRef.current.scrollTo(0, chatWindowRef.current.scrollHeight);

    }
    async function addMessage(from, msg) {
        if (msg.trim() === '') return

        // get the current time hh:mm
        const time = new Date().toLocaleTimeString().slice(0, 5)
        setChat([...chat, { from, msg, time }])
        setMessage('')
        setTimeout(() => {
            chatWindowRef.current.scrollTo(0, chatWindowRef.current.scrollHeight);
        }, 200);
        if (msg.trim().startsWith('/')) {
            await handleCommand(msg.trim());
            return
        }
        //chatWindowRef.current.scrollTo(0, chatWindowRef.current.scrollHeight);
        if (from === 'ME') {
            // send the message to the server
            try {
                setIsLoading(true);
                const response = await fetch('/api/send?message= ' + encodeURIComponent(msg));
                const data = await response.json();
                setIsLoading(false);

                // add the response from the server to the chat
                setChat([...chat, { from, msg, time }, { from: 'AI', msg: data.join('\n'), time }])
                chatWindowRef.current.scrollTo(0, chatWindowRef.current.scrollHeight);
            } catch (error) {
                console.error(error);
            }
        }

    }
    return (
        <div>
            {isLoading && <CircularProgress style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
            }} />}

            <Grid container component={Paper} className={classes.chatSection}>

                <Grid item xs={12}>
                    <List className={classes.messageArea} ref={chatWindowRef}>
                        {chat.map((c, i) =>

                            <ListItem key={i}>
                                <Grid container>
                                    <Grid item xs={12}>

                                        <ListItemText align={c.from === 'AI' ? 'left' : 'right'} primary={<ReactMarkdown remarkPlugins={[remarkGfm]}>{c.msg}</ReactMarkdown>}> </ListItemText>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <ListItemText align={c.from === 'AI' ? 'left' : 'right'} secondary={c.from + ' at ' + c.time}></ListItemText>
                                    </Grid>
                                </Grid>
                            </ListItem>
                        )}

                    </List>
                    <Divider />
                    <Grid container style={{ padding: '20px' }}>
                        <Grid item xs={11}>
                            <TextField id="chat-input" InputProps={{
                                disableUnderline: true,
                            }} onChange={handleChange} onKeyDown={keyPress} value={message} label="Type Something" fullWidth />
                        </Grid>
                        <Grid xs={1} align="right">
                            <Fab color="primary" disabled={isLoading} onClick={async () => await addMessage('ME', message)} aria-label="add"><SendIcon /></Fab>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </div>
    );
}

export default Chat;