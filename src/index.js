import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import NameValueFields from './components/NameValueFields';
import AuthorizationFields from './components/AuthorizationFields';
import { encode } from "base-64";
import RequestBody from './components/RequestBody';
import { defaultBodyObject, rodanExtensionId, bufferToString, base64ToBuffer } from './utils';
import ExampleRestCalls from './components/ExampleRestCalls';
import LJSON from 'ljson';
import RodanResponse from './http/RodanResponse';



class Main extends React.Component {
    constructor() {
        super();
        this.state = {
            url: 'https://jsonplaceholder.typicode.com/users',
            method: 'GET',
            headers: [],
            errors: [],
            queryParams: [],
            showResult: false,
            auth: {},
            body: defaultBodyObject
        };
    }

    checkErrors = () => {

        let errors = [];

        this.state.headers.forEach((item) => {
            if (item.name.length === 0) {
                errors.push('Headers cannot be empty');
            }
        });

        return errors;
    }

    btnSubmitRestCall = event => {

        event.preventDefault();

        // This will show the results section
        this.setState({ showResult: true });

        // Clear previous errors and check for new ones
        this.setState({ errors: [] });

        let errorsArray = this.checkErrors();
        if (errorsArray.length > 0) {
            this.setState({ errors: errorsArray.slice() });
            return;
        }

        this.setState({ response: 'fetching...' });

        let queryParams = '';
        if (this.state.queryParams.length > 0) {
            queryParams = '?';
            this.state.queryParams.map((item) => {
                if (item.name.length > 0) {
                    queryParams = queryParams + item.name + '=' + item.value + '&';
                }

                return item; // To get rid of warning
            });
            queryParams = queryParams.slice(0, -1); // Delete last ampersand (&)
        }

        let url = this.state.url + queryParams;
        console.log(url);

        // Assign headers array from the state
        let headers = Object.assign({}, ...this.state.headers.map(item => ({ [item.name]: item.value })));

        // Assign authorization array from the state
        if (this.state.auth.type != null && this.state.auth.type === 'basic') {
            console.log('adding auth')
            headers = Object.assign(headers, {
                'Authorization': 'Basic ' + encode(this.state.auth.username + ":" + this.state.auth.password)
            });
        }

        // Add request body if it's selected
        let body = this.state.body.content;
        if (this.state.body.type !== 'no') {
            if (this.state.body.type === 'raw') {
                let contentType = {};
                switch (this.state.body.contentType) {
                    case 'raw-json':
                        contentType = { 'Content-Type': 'application/json' };
                        break;
                    case 'raw-xml':
                        contentType = { 'Content-Type': 'application/xml' };
                        break;
                    case 'raw-javacript':
                        contentType = { 'Content-Type': 'application/javascript' };
                        break;

                    default:
                        contentType = { 'Content-Type': 'application/text' };
                }

                headers = Object.assign(headers, contentType);
            }
        }

        let fetchOptions = {
            method: this.state.method,
            headers: headers
        }

        if (this.state.method !== 'GET' && body.type !== 'no') {
            fetchOptions =
                Object.assign(fetchOptions, { body: body })
        }


        try {
            window.chrome.runtime.sendMessage(
                rodanExtensionId,
                { url: url, options: fetchOptions },
                res => {
                    console.log({res})

                    if (res._fetchSuceeded === true ) {
                        const response = new RodanResponse();
                        response.bodyFromBase64(res._base64Body);
                        response.code = res._statusCode;
                        response.headers = new Map(JSON.parse(res._headers));

                        console.log({ response })

                        const json = response.getBodyAsJson();

                        this.setState({ response: JSON.stringify(json) });
                    } else {
                        this.setState({ response: `error connection to ${this.state.url}` });
                    }


                }
            );
        } catch (err) { // extension not found
            console.log(err)
        }




    }

    headersStateUpdated = (headersCopy) => {
        this.setState({ headers: headersCopy })
    }

    queryParamsStateUpdated = (paramsCopy) => {
        this.setState({ queryParams: paramsCopy })
    }



    authStateUpdated = (authCopy) => {
        console.log('authStateUpdated');
        this.setState({
            auth: authCopy
        });

    }

    stateUpdated = (stateCopy) => {
        this.setState({ ...this.state, ...stateCopy });
    }

    bodyComponentUpdated = (bodyCopy) => {
        console.log('body updated');
        this.setState({
            body: bodyCopy
        })
    }

    render() {
        return (

            <div className="container-fluid mt-3">
                <div className="row content">
                    <div className="col-lg-1"></div>
                    <div className="col-lg-5">

                        <div className="input-group">
                            <select
                                className="custom-select flex-shrink w-auto"
                                value={this.state.method}
                                onChange={(e) => this.setState({ method: e.target.value })}>

                                <option value="POST">POST</option>
                                <option value="GET">GET</option>
                                <option value="PUT">PUT</option>
                            </select>

                            <input type="text" value={this.state.url} placeholder="HTTP URL" className="form-control" onChange={(e) => this.setState({ url: e.target.value })} />
                            <span className="input-group-btn ml-1"><input type="button" value="Call" className="btn btn-primary" onClick={this.btnSubmitRestCall} /></span>
                        </div>



                        <hr />

                        <AuthorizationFields
                            auth={this.state.auth}
                            authStateUpdatedCallback={this.authStateUpdated} />

                        <hr />

                        <NameValueFields
                            headingText='HTTP Header'
                            buttonText='Add Headers'
                            fieldsStateUpdatedCallback={this.headersStateUpdated}
                            initialValues={this.state.headers.slice()} />

                        <hr />

                        <NameValueFields
                            headingText='Query Parameters'
                            buttonText='Add Parameters'
                            fieldsStateUpdatedCallback={this.queryParamsStateUpdated}
                            initialValues={this.state.queryParams.slice()} />

                        <hr />

                        <RequestBody
                            body={this.state.body}
                            onComponentParamsUpdate={this.bodyComponentUpdated} />

                        <hr />

                        <ExampleRestCalls
                            stateUpdatedCallback={this.stateUpdated} />

                    </div>
                    <div className="col-lg-5">
                        {/*
                        Check for errors and render the ResultsSection component with either error message
                        or the actual response depending on whether there are errors or not.
                        */}

                        {(this.state.errors.length > 0) ?
                            <ResultsSection
                                heading={`Error`}
                                message={this.state.errors}
                            />
                            :
                            <ResultsSection
                                heading={`${this.state.method} ${this.state.url}`}
                                message={this.state.response}
                            />
                        }



                    </div>
                    <div className="col-lg-1"></div>
                </div>
            </div>
        );
    }
};

class ResultsSection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {}
    }

    render() {
        return (
            <>
                <h5> {`Result: ${this.props.heading}`}  </h5>
                <pre class="prettyprint">{this.props.message}</pre>
            </>
        );
    }
}
ReactDOM.render(<Main />, document.getElementById('root'));